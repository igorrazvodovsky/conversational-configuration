"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModeToggleProps {
  mode: "chat" | "app";
  onModeChange: (mode: "chat" | "app") => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <Tabs
      value={mode}
      onValueChange={(value) => onModeChange(value as "chat" | "app")}
      className="fixed top-4 right-4 z-50"
    >
      <TabsList className="min-h-[46px] border bg-secondary p-1.5">
        <TabsTrigger value="chat" className="px-4 text-[13px]">
          Chat
        </TabsTrigger>
        <TabsTrigger value="app" className="px-4 text-[13px]">
          App
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
