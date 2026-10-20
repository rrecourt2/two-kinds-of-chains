// SharePoint Framework web part ("No framework" template) that hosts the story.
// Copy dist-lib/two-chains.js and two-chains.d.ts into ./story/ next to this file.
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { mountStory } from './story/two-chains.js';

export interface ITwoChainsWebPartProps {}

export default class TwoChainsWebPart extends BaseClientSideWebPart<ITwoChainsWebPartProps> {
  private story: { destroy(): void } | undefined;

  public render(): void {
    // render() runs again when properties change; mount only once.
    if (!this.story) {
      this.story = mountStory(this.domElement, { theme: 'light', syncHash: false });
    }
  }

  protected onDispose(): void {
    this.story?.destroy();
    this.story = undefined;
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
