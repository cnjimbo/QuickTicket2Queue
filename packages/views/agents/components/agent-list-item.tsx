<!--
🤖 【中文注释】
  工具名称: 代理列表项
  功能分类: 通用助手
  功能说明: 用于展示代理列表项，支持选择和操作代理。
  使用方式: 在 Agents 面板中浏览代理列表，点击列表项进行操作。
  关键标签: 代理管理、列表展示
-->

"use client";

import { Cloud, Monitor } from "lucide-react";
import type { Agent } from "@multica/core/types";
import { ActorAvatar } from "../../common/actor-avatar";
import { statusConfig } from "../config";

export function AgentListItem({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const st = statusConfig[agent.status];
  const isArchived = !!agent.archived_at;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      <ActorAvatar actorType="agent" actorId={agent.id} size={32} className={`rounded-lg ${isArchived ? "opacity-50 grayscale" : ""}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm font-medium ${isArchived ? "text-muted-foreground" : ""}`}>{agent.name}</span>
          {agent.runtime_mode === "cloud" ? (
            <Cloud className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Monitor className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isArchived ? (
            <span className="text-xs text-muted-foreground">Archived</span>
          ) : (
            <>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              <span className={`text-xs ${st.color}`}>{st.label}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
