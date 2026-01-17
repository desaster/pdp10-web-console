//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Cheat sheet content per terminal type

export interface CheatSection {
    title: string;
    items?: { key: string; desc: string }[];
    text?: string; // Plain text content (monospace)
}

export interface CheatSheet {
    sections: CheatSection[];
}

export const cheatsheets: Record<string, CheatSheet> = {
    tv11: {
        sections: [
            {
                title: 'Keyboard',
                items: [
                    { key: 'F1', desc: 'Login (CALL)' },
                    { key: 'F2', desc: 'ESC' },
                    { key: 'F3', desc: 'Back' },
                    { key: 'F4', desc: 'Clear screen' },
                    { key: 'F12', desc: 'BREAK' },
                    { key: 'Escape', desc: 'ALT MODE' },
                ],
            },
            {
                title: 'Display',
                items: [{ key: 'F8/F11', desc: 'Fullscreen' }],
            },
            {
                title: 'ITS Commands',
                items: [
                    { key: ':login', desc: 'Login as user' },
                    { key: ':logout', desc: 'Log out' },
                    { key: ':listf', desc: 'List files' },
                ],
            },
        ],
    },
    console: {
        sections: [
            {
                title: 'ITS Commands',
                items: [
                    { key: ':login', desc: 'Login as user' },
                    { key: ':logout', desc: 'Log out' },
                    { key: ':listf', desc: 'List files' },
                ],
            },
            {
                title: 'Boot procedure',
                text: `When DSKDMP is on screen:
its&lt;return&gt;&lt;esc&gt;g
`,
            },
            {
                title: 'Shutdown Procedure',
                text: `Ctrl-Z (if needed)
:logout (if logged in)
:lock
5down
y
Ctrl-C
`,
            },
        ],
    },
    terminal: {
        sections: [
            {
                title: 'ITS Commands',
                items: [
                    { key: ':login', desc: 'Login as user' },
                    { key: ':logout', desc: 'Log out' },
                    { key: ':listf', desc: 'List files' },
                ],
            },
            {
                title: 'Control',
                items: [
                    { key: 'Ctrl+Z', desc: 'Interrupt' },
                    { key: 'Ctrl+G', desc: 'Quit process' },
                ],
            },
            {
                title: 'Login procedure',
                text: `Ctrl+Z
:login BOB
`,
            },
            {
                title: 'Logout procedure',
                text: `
:logout
`,
            },
        ],
    },
};
