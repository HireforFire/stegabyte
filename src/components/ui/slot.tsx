import * as React from "react";

/**
 * Minimal Slot implementation matching the radix-slot API surface,
 * but with no external dependency. Clones the single child element and merges
 * its props with the props passed to Slot, giving precedence to the child.
 *
 * This intentionally overrides only className and event handlers; other
 * props are merged with child take precedence. This keeps the public
 * `asChild` ergonomics of Button, Link, etc. without pulling radix-ui.
 */
export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

type ChildProps = {
  ref?: React.Ref<HTMLElement>;
  className?: string;
};

export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  function Slot(slotProps, ref) {
    const { children, ...restSlotProps } = slotProps;
    if (!React.isValidElement(children)) return null;

    const child = children as React.ReactElement<ChildProps>;
    const childProps = child.props;

    const merged: Record<string, unknown> = { ...restSlotProps, ...childProps };

    if (restSlotProps.className) {
      merged.className = [restSlotProps.className, childProps.className]
        .filter(Boolean)
        .join(" ");
    }

    const childRef = (childProps.ref ?? null) as React.Ref<HTMLElement> | null;
    if (ref && childRef) {
      merged.ref = composeRefs<HTMLElement>(ref, childRef);
    } else if (ref) {
      merged.ref = ref;
    } else if (childRef) {
      merged.ref = childRef;
    }

    return React.cloneElement(child, merged);
  },
);

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | null | undefined>
): React.RefCallback<T> {
  return (node: T | null) => {
    for (const r of refs) {
      if (typeof r === "function") r(node);
      else if (r && typeof r === "object") {
        (r as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}
