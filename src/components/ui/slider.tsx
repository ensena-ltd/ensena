"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: SliderPrimitive.Root.Props<number>) {
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn("w-full", className)} {...props}>
      <SliderPrimitive.Control className="flex w-full items-center py-2">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-ensena-border">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-ensena-primary" />
          <SliderPrimitive.Thumb className="size-4 rounded-full border-2 border-ensena-primary bg-white shadow outline-none focus-visible:ring-2 focus-visible:ring-ensena-primary/40" />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
