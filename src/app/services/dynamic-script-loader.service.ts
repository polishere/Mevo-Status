import { Injectable } from '@angular/core';

interface Scripts {
  name: string;
  src: string;
}

export const ScriptStore: Scripts[] = [
  { name: 'Mevo', src: 'https://rowermevo.pl/locations.js' },
];

declare var document: any;

@Injectable()
export class DynamicScriptLoaderService {

  private scripts: any = {};

  constructor() {
    ScriptStore.forEach((script: any) => {
      this.scripts[script.name] = {
        loaded: false,
        src: script.src
      };
    });
  }

  load(...scripts: string[]) {
    const promises: any[] = [];
    scripts.forEach((script) => promises.push(this.loadScript(script)));
    return Promise.all(promises);
  }

  loadScript(url: string) {
    return new Promise((resolve, reject) => {
      this.scripts[url] = {
        loaded: false,
        src: url
      };
      if (!this.scripts[url].loaded) {
        // load script
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        if (script.readyState) {  //IE
            script.onreadystatechange = () => {
                if (script.readyState === 'loaded' || script.readyState === 'complete') {
                    script.onreadystatechange = null;
                    this.scripts[url].loaded = true;
                    resolve({script: url, loaded: true, status: 'Loaded'});
                }
            };
        } else {  // Others
            script.onload = () => {
                this.scripts[url].loaded = true;
                resolve({script: url, loaded: true, status: 'Loaded'});
            };
        }
        script.onerror = (error: any) => resolve({script: url, loaded: false, status: 'Loaded'});
        document.getElementsByTagName('head')[0].appendChild(script);
      } else {
        resolve({ script: url, loaded: true, status: 'Already Loaded' });
      }
    });
  }

}