export const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', icon: 'SiJavascript', defaultCode: 'console.log("Hello World!");' },
  { id: 'python', name: 'Python', icon: 'SiPython', defaultCode: 'print("Hello World!")' },
  { id: 'java', name: 'Java', icon: 'SiJava', defaultCode: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World!");\n  }\n}' },
  { id: 'typescript', name: 'TypeScript', icon: 'SiTypescript', defaultCode: 'console.log("Hello World!");' },
  { id: 'cpp', name: 'C++', icon: 'SiCplusplus', defaultCode: '#include <iostream>\n\nint main() {\n  std::cout << "Hello World!" << std::endl;\n  return 0;\n}' },
  { id: 'go', name: 'Go', icon: 'SiGo', defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello World!")\n}' },
  { id: 'rust', name: 'Rust', icon: 'SiRust', defaultCode: 'fn main() {\n  println!("Hello World!");\n}' },
];

// Must match the server's socket event names exactly
export const SOCKET_EVENTS = {
  // Room events
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  ROOM_INFO: 'room:info',
  ROOM_USERS: 'room:users',
  USER_JOINED: 'room:user-joined',
  USER_LEFT: 'room:user-left',

  // Editor events
  CODE_CHANGE: 'editor:change',
  CURSOR_CHANGE: 'editor:cursor',
  LANGUAGE_CHANGE: 'editor:language-change',
  SAVE_SNAPSHOT: 'editor:save-snapshot',
  GET_SNAPSHOTS: 'editor:get-snapshots',
  RESTORE_SNAPSHOT: 'editor:restore-snapshot',
  SNAPSHOT_SAVED: 'editor:snapshot-saved',
  SYNC_REQUEST: 'editor:sync-request',

  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',

  // General
  ERROR: 'error',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
};

export const COLORS = [
  '#e06c75', '#98c379', '#61afef', '#c678dd', '#e5c07b',
  '#56b6c2', '#be5046', '#d19a66', '#abb2bf', '#ff6b6b',
  '#51cf66', '#339af0', '#cc5de8', '#fcc419', '#22b8cf',
];

export const EDITOR_OPTIONS = {
  minimap: { enabled: true },
  lineNumbers: 'on',
  autoClosingBrackets: 'always',
  fontFamily: "'Fira Code', 'Consolas', monospace",
  fontSize: 14,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 16 },
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  bracketPairColorization: { enabled: true },
  wordWrap: 'on',
};
