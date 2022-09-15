import { WheelDetail } from "@/actions/wheel";

type EventWithTarget<Event, Target> = Event & { currentTarget: Target };

declare namespace svelte.JSX {
  interface HTMLAttributes<T> {
    onwheeling?: (
      event: CustomEvent<WheelDetail> & { target: EventTarget & T }
    ) => void;
  }
}

export {};
