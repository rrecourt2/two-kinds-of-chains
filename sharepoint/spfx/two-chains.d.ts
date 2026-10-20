export interface StoryOptions {
  /** 'light' (default), 'dark', or 'auto' to follow the operating system. */
  theme?: 'light' | 'dark' | 'auto';
  /** Keep the page URL in step with the chapter (#riddle, #dependence …). Default false. */
  syncHash?: boolean;
  /** Chapter id to open first, for example 'dependence'. */
  startAt?: string;
}

export function mountStory(target: HTMLElement, options?: StoryOptions): { destroy(): void };
