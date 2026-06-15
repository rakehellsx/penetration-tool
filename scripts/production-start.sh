#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export OPENCODE_PORT="${OPENCODE_PORT:-4096}"
export OPENCODE_API_URL="${OPENCODE_API_URL:-http://127.0.0.1:${OPENCODE_PORT}}"
export PATH="/usr/local/go/bin:${HOME}/.opencode/bin:${PATH}"

if [[ ! -f dist/index.js ]]; then
  echo "dist/index.js 不存在，请先执行 pnpm run build" >&2
  exit 1
fi

if [[ ! -x "$(command -v opencode || true)" ]]; then
  echo "未找到 opencode 命令，请先安装 OpenCode CLI：curl -fsSL https://opencode.ai/install | bash" >&2
  exit 1
fi

if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
  echo "DEEPSEEK_API_KEY 未设置，智能助手将无法调用 DeepSeek。" >&2
fi

mkdir -p logs generated/windows-revshell

cleanup() {
  if [[ -n "${OPENCODE_PID:-}" ]] && kill -0 "$OPENCODE_PID" 2>/dev/null; then
    kill "$OPENCODE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

opencode serve --hostname 127.0.0.1 --port "$OPENCODE_PORT" >> logs/opencode.log 2>&1 &
OPENCODE_PID=$!

for i in {1..30}; do
  if curl -fsS "${OPENCODE_API_URL}/app" >/dev/null 2>&1 || curl -fsS "${OPENCODE_API_URL}/doc" >/dev/null 2>&1; then
    echo "OpenCode 已启动：${OPENCODE_API_URL}"
    break
  fi
  if ! kill -0 "$OPENCODE_PID" 2>/dev/null; then
    echo "OpenCode 启动失败，请查看 logs/opencode.log" >&2
    exit 1
  fi
  sleep 1
  if [[ "$i" == "30" ]]; then
    echo "OpenCode 启动超时，请查看 logs/opencode.log" >&2
    exit 1
  fi
done

echo "站点服务启动：0.0.0.0:${PORT}"
exec node dist/index.js
