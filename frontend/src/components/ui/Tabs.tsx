// components/ui/Tabs.tsx
import React, { createContext, useContext, useState } from "react";

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs component");
  }
  return context;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  ...props
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [tabValue, setTabValue] = useState(value || defaultValue || "");

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setTabValue(newValue);
    }
  };

  return (
    <TabsContext.Provider
      value={{ value: value !== undefined ? value : tabValue, onValueChange: handleValueChange }}
    >
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center space-x-2 border-b border-gray-200 ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  className,
  value,
  children,
  ...props
}: {
  value: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLButtonElement>) {
  const { value: selectedValue, onValueChange } = useTabs();
  const isActive = selectedValue === value;

  return (
    <button
      type="button"
      className={`px-4 py-2 text-sm font-medium ${
        isActive
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-600 hover:text-gray-800 hover:border-b-2 hover:border-gray-300"
      } ${className || ""}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  className,
  value,
  children,
  ...props
}: {
  value: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { value: selectedValue } = useTabs();
  const isActive = selectedValue === value;

  if (!isActive) {
    return null;
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}