/// Telnet protocol constants and IAC handling

// Telnet commands
pub const IAC: u8 = 255;  // Interpret As Command
pub const DONT: u8 = 254;
pub const DO: u8 = 253;
pub const WONT: u8 = 252;
pub const WILL: u8 = 251;
pub const SB: u8 = 250;   // Subnegotiation Begin
pub const SE: u8 = 240;   // Subnegotiation End

// Telnet options
pub const OPT_BINARY: u8 = 0;
pub const OPT_ECHO: u8 = 1;
pub const OPT_SGA: u8 = 3;       // Suppress Go Ahead
pub const OPT_NAWS: u8 = 31;     // Negotiate About Window Size
pub const OPT_LINEMODE: u8 = 34;

/// Telnet state machine for processing incoming data
pub struct TelnetHandler {
    state: TelnetState,
    /// Responses to send back to server
    responses: Vec<u8>,
    /// Clean data to forward to client
    output: Vec<u8>,
    /// Whether we've sent NAWS
    naws_sent: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum TelnetState {
    Data,
    Iac,
    Will,
    Wont,
    Do,
    Dont,
    Sb,
    SbData,
    SbIac,
}

impl TelnetHandler {
    pub fn new() -> Self {
        Self {
            state: TelnetState::Data,
            responses: Vec::new(),
            output: Vec::new(),
            naws_sent: false,
        }
    }

    /// Build NAWS subnegotiation for 80x24 terminal
    pub fn build_naws(cols: u16, rows: u16) -> Vec<u8> {
        vec![
            IAC, SB, OPT_NAWS,
            (cols >> 8) as u8, (cols & 0xff) as u8,
            (rows >> 8) as u8, (rows & 0xff) as u8,
            IAC, SE,
        ]
    }

    /// Process incoming data from server, returns (data_for_client, responses_for_server)
    pub fn process(&mut self, data: &[u8]) -> (Vec<u8>, Vec<u8>) {
        self.output.clear();
        self.responses.clear();

        for &byte in data {
            self.process_byte(byte);
        }

        (std::mem::take(&mut self.output), std::mem::take(&mut self.responses))
    }

    fn process_byte(&mut self, byte: u8) {
        match self.state {
            TelnetState::Data => {
                if byte == IAC {
                    self.state = TelnetState::Iac;
                } else {
                    self.output.push(byte);
                }
            }
            TelnetState::Iac => {
                match byte {
                    IAC => {
                        // Escaped IAC, output literal 255
                        self.output.push(IAC);
                        self.state = TelnetState::Data;
                    }
                    WILL => self.state = TelnetState::Will,
                    WONT => self.state = TelnetState::Wont,
                    DO => self.state = TelnetState::Do,
                    DONT => self.state = TelnetState::Dont,
                    SB => self.state = TelnetState::Sb,
                    SE => self.state = TelnetState::Data,
                    _ => {
                        // Unknown command, ignore
                        self.state = TelnetState::Data;
                    }
                }
            }
            TelnetState::Will => {
                self.handle_will(byte);
                self.state = TelnetState::Data;
            }
            TelnetState::Wont => {
                self.handle_wont(byte);
                self.state = TelnetState::Data;
            }
            TelnetState::Do => {
                self.handle_do(byte);
                self.state = TelnetState::Data;
            }
            TelnetState::Dont => {
                self.handle_dont(byte);
                self.state = TelnetState::Data;
            }
            TelnetState::Sb => {
                // Start of subnegotiation, just consume option byte
                self.state = TelnetState::SbData;
            }
            TelnetState::SbData => {
                if byte == IAC {
                    self.state = TelnetState::SbIac;
                }
                // Otherwise ignore subnegotiation data
            }
            TelnetState::SbIac => {
                if byte == SE {
                    self.state = TelnetState::Data;
                } else if byte == IAC {
                    // Escaped IAC in subnegotiation
                    self.state = TelnetState::SbData;
                } else {
                    self.state = TelnetState::SbData;
                }
            }
        }
    }

    fn handle_will(&mut self, opt: u8) {
        // Server offers to do something - we generally accept
        match opt {
            OPT_ECHO | OPT_SGA | OPT_BINARY => {
                // Accept these options
                self.responses.extend_from_slice(&[IAC, DO, opt]);
            }
            OPT_NAWS => {
                // Server says it will do NAWS - send our window size
                self.responses.extend_from_slice(&[IAC, DO, opt]);
                if !self.naws_sent {
                    self.responses.extend_from_slice(&Self::build_naws(80, 24));
                    self.naws_sent = true;
                }
            }
            _ => {
                // Refuse unknown options
                self.responses.extend_from_slice(&[IAC, DONT, opt]);
            }
        }
    }

    fn handle_wont(&mut self, opt: u8) {
        // Server refuses to do something - acknowledge
        self.responses.extend_from_slice(&[IAC, DONT, opt]);
    }

    fn handle_do(&mut self, opt: u8) {
        // Server asks us to do something
        match opt {
            OPT_NAWS => {
                // Server asks for our window size
                self.responses.extend_from_slice(&[IAC, WILL, opt]);
                if !self.naws_sent {
                    self.responses.extend_from_slice(&Self::build_naws(80, 24));
                    self.naws_sent = true;
                }
            }
            OPT_BINARY => {
                // Accept binary mode
                self.responses.extend_from_slice(&[IAC, WILL, opt]);
            }
            _ => {
                // Refuse other options
                self.responses.extend_from_slice(&[IAC, WONT, opt]);
            }
        }
    }

    fn handle_dont(&mut self, opt: u8) {
        // Server asks us not to do something - acknowledge
        self.responses.extend_from_slice(&[IAC, WONT, opt]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plain_data() {
        let mut handler = TelnetHandler::new();
        let (output, responses) = handler.process(b"hello");
        assert_eq!(output, b"hello");
        assert!(responses.is_empty());
    }

    #[test]
    fn test_will_echo() {
        let mut handler = TelnetHandler::new();
        let (output, responses) = handler.process(&[IAC, WILL, OPT_ECHO]);
        assert!(output.is_empty());
        assert_eq!(responses, &[IAC, DO, OPT_ECHO]);
    }

    #[test]
    fn test_mixed_data_and_iac() {
        let mut handler = TelnetHandler::new();
        let input = [b'A', IAC, WILL, OPT_SGA, b'B'];
        let (output, responses) = handler.process(&input);
        assert_eq!(output, b"AB");
        assert_eq!(responses, &[IAC, DO, OPT_SGA]);
    }

    #[test]
    fn test_escaped_iac() {
        let mut handler = TelnetHandler::new();
        let (output, _) = handler.process(&[IAC, IAC]);
        assert_eq!(output, &[255]);
    }
}
