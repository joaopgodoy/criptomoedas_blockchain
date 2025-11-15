import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

type TabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">;

export const Tabs: React.FC<TabsProps> = (props: TabsProps) => {
  const { defaultValue, value: valueProp, onValueChange, className, children, ...rest } = props;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = valueProp ?? internalValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (onValueChange) onValueChange(next);
      if (valueProp === undefined) setInternalValue(next);
    },
    [onValueChange, valueProp]
  );

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    role="tablist"
    className={cn(
      "mb-6 inline-flex h-10 items-center justify-start rounded-md bg-secondary p-1 text-sm font-medium text-secondary-foreground",
      className
    )}
    {...props}
  />
);

type TabsTriggerProps = {
  value: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  (props: TabsTriggerProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const { value, className, ...rest } = props;
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsTrigger must be used within Tabs");
    const isActive = context.value === value;
    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        onClick={() => context.setValue(value)}
        className={cn(
          "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-sm px-3 transition-all",
          isActive ? "bg-white text-foreground shadow" : "text-muted-foreground",
          className
        )}
        {...rest}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

type TabsContentProps = {
  value: string;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  (props: TabsContentProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { value, className, children, ...rest } = props;
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsContent must be used within Tabs");
    if (context.value !== value) return null;
    return (
      <div ref={ref} role="tabpanel" className={cn(className)} {...rest}>
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";
