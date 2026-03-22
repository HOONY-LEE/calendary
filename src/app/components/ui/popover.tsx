"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "./utils";

// Filter out Figma inspector props - more comprehensive
const filterFigmaProps = (props: any) => {
  if (!props) return props;
  
  const { 
    _fgT, _fgt, 
    _fgS, _fgs, 
    _fgB, _fgb,
    _fgC, _fgc,
    _fgD, _fgd,
    _fgE, _fge,
    _fgF, _fgf,
    _fgG, _fgg,
    _fgH, _fgh,
    _fgI, _fgi,
    _fgJ, _fgj,
    _fgK, _fgk,
    _fgL, _fgl,
    _fgM, _fgm,
    _fgN, _fgn,
    _fgO, _fgo,
    _fgP, _fgp,
    _fgQ, _fgq,
    _fgR, _fgr,
    _fgU, _fgu,
    _fgV, _fgv,
    _fgW, _fgw,
    _fgX, _fgx,
    _fgY, _fgy,
    _fgZ, _fgz,
    ...rest 
  } = props;
  
  return rest;
};

const Popover = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>
>((props, ref) => {
  const filteredProps = filterFigmaProps(props);
  return <PopoverPrimitive.Root {...filteredProps} />;
});
Popover.displayName = "Popover";

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, ref) => {
  const filteredProps = filterFigmaProps(props);
  return <PopoverPrimitive.Trigger ref={ref} {...filteredProps} />;
});
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverAnchor = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Anchor>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>
>((props, ref) => {
  const filteredProps = filterFigmaProps(props);
  return <PopoverPrimitive.Anchor ref={ref} {...filteredProps} />;
});
PopoverAnchor.displayName = "PopoverAnchor";

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const filteredProps = filterFigmaProps(props);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className,
        )}
        {...filteredProps}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };