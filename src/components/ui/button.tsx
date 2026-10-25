import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] focus-visible:ring-2 focus-visible:ring-[#DC2626]/40 shadow-xs font-bold",
        outline:
          "border border-[#E7E5E4] bg-white text-[#1E293B] hover:bg-[#FFF8E7] focus-visible:ring-2 focus-visible:ring-[#64748B]/30 shadow-xs",
        secondary:
          "bg-white text-[#1E293B] border border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB] active:bg-[#DBEAFE] focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 font-semibold shadow-xs",
        ghost:
          "hover:bg-[#FFF8E7] text-[#1E293B] hover:text-[#1E293B] active:bg-[#E7E5E4]/50",
        destructive:
          "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] focus-visible:ring-2 focus-visible:ring-[#DC2626]/40 font-bold shadow-xs",
        info:
          "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] active:bg-[#BFDBFE]/60 focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 font-semibold shadow-xs",
        link: "text-[#2563EB] underline-offset-4 hover:underline font-semibold",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
