import * as React from "react";
import { createComponent } from "reakit-system/createComponent";
import { createHook } from "reakit-system/createHook";
import { useLiveRef } from "reakit-utils/useLiveRef";
import { mergeRefs } from "reakit-utils/mergeRefs";
import { useAllCallbacks } from "reakit-utils/useAllCallbacks";
import { BoxOptions, BoxHTMLProps, useBox } from "../Box/Box";

export type TabbableOptions = BoxOptions & {
  /**
   * Same as the HTML attribute.
   */
  disabled?: boolean;
  /**
   * When an element is `disabled`, it may still be `focusable`. It works
   * similarly to `readOnly` on form elements. In this case, only
   * `aria-disabled` will be set.
   */
  focusable?: boolean;
  /**
   * Keyboard keys to trigger click.
   * @private
   */
  unstable_clickKeys?: string[];
};

export type TabbableHTMLProps = BoxHTMLProps & {
  disabled?: boolean;
};

export type TabbableProps = TabbableOptions & TabbableHTMLProps;

function isNativeTabbable(element: EventTarget) {
  if (element instanceof HTMLButtonElement) return true;
  if (element instanceof HTMLInputElement) return true;
  if (element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLAnchorElement) return true;
  if (element instanceof HTMLAudioElement) return true;
  if (element instanceof HTMLVideoElement) return true;
  return false;
}

const defaultClickKeys = ["Enter", " "];

export const useTabbable = createHook<TabbableOptions, TabbableHTMLProps>({
  name: "Tabbable",
  compose: useBox,
  keys: ["disabled", "focusable", "unstable_clickKeys"],

  useOptions({ unstable_clickKeys = defaultClickKeys, ...options }, htmlProps) {
    return {
      unstable_clickKeys,
      disabled: htmlProps.disabled,
      ...options
    };
  },

  useProps(
    options,
    {
      ref: htmlRef,
      tabIndex: htmlTabIndex = 0,
      onClick: htmlOnClick,
      onMouseOver: htmlOnMouseOver,
      onMouseDown: htmlOnMouseDown,
      onKeyDown: htmlOnKeyDown,
      ...htmlProps
    }
  ) {
    const ref = React.useRef<HTMLElement>(null);
    const clickKeysRef = useLiveRef(options.unstable_clickKeys);
    const trulyDisabled = options.disabled && !options.focusable;

    const onMouseDown = React.useCallback(
      (event: React.MouseEvent) => {
        if (event.target instanceof HTMLInputElement) {
          if (htmlOnMouseDown) {
            htmlOnMouseDown(event);
          }
          return;
        }
        event.preventDefault();
        if (options.disabled) {
          event.stopPropagation();
        } else {
          (ref.current || (event.target as HTMLElement)).focus();
          if (htmlOnMouseDown) {
            htmlOnMouseDown(event);
          }
        }
      },
      [options.disabled, htmlOnMouseDown]
    );

    const onClick = React.useCallback(
      (event: React.MouseEvent) => {
        if (options.disabled) {
          event.stopPropagation();
          event.preventDefault();
        } else if (htmlOnClick) {
          htmlOnClick(event);
        }
      },
      [options.disabled, htmlOnClick]
    );

    const onMouseOver = React.useCallback(
      (event: React.MouseEvent) => {
        if (options.disabled) {
          event.stopPropagation();
          event.preventDefault();
        } else if (htmlOnMouseOver) {
          htmlOnMouseOver(event);
        }
      },
      [options.disabled, htmlOnMouseOver]
    );

    const onKeyDown = React.useCallback(
      (event: React.KeyboardEvent) => {
        if (options.disabled) return;

        const isClickKey =
          clickKeysRef.current &&
          clickKeysRef.current.indexOf(event.key) !== -1;

        if (!isClickKey) return;

        const isDefaultClickKey = defaultClickKeys.indexOf(event.key) !== -1;

        if (isDefaultClickKey && isNativeTabbable(event.target)) {
          return;
        }

        event.preventDefault();
        event.target.dispatchEvent(
          new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: false
          })
        );
      },
      [clickKeysRef, options.disabled]
    );

    return {
      ref: mergeRefs(ref, htmlRef),
      disabled: trulyDisabled,
      tabIndex: trulyDisabled ? undefined : htmlTabIndex,
      "aria-disabled": options.disabled,
      onMouseDown,
      onClick,
      onMouseOver,
      onKeyDown: useAllCallbacks(onKeyDown, htmlOnKeyDown),
      ...htmlProps
    };
  }
});

export const Tabbable = createComponent({
  as: "button",
  useHook: useTabbable
});
