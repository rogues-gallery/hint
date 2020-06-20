import * as path from 'path';

import { readFileAsync } from '@hint/utils-fs';
import { IServer, Server, ServerConfiguration } from '@hint/utils-create-server';

import { Page, Props as AppProps } from '../../src/devtools/views/app';

type State = {
    action: Function;
    name: string;
};

const states: (AppProps & State)[] = [
    {
        action() { },
        name: 'configuration',
        page: Page.Config
    },
    {
        action() { },
        isAnalyzing: true,
        name: 'analyzing',
        page: Page.Config
    },
    {
        action() { },
        error: {
            message: 'Test error message.',
            stack: '(empty)'
        },
        name: 'error',
        page: Page.Error
    },
    {
        action() {
            window.addEventListener('DOMContentLoaded', () => {
                for (const summary of document.querySelectorAll('summary')) {
                    summary.click();
                }
            });
        },
        name: 'results',
        page: Page.Results,
        results: require('../fixtures/results.json')
    }
];

export const hostUI = async (): Promise<[IServer, string[]]> => {

    const [rawHtmlSource, jsSource, apiSource] = await Promise.all([
        readFileAsync(path.resolve(__dirname, '../../bundle/devtools/panel.html')),
        readFileAsync(path.resolve(__dirname, '../../bundle/devtools/panel.js')),
        readFileAsync(path.resolve(__dirname, '../fixtures/mock-extension-apis.js'))
    ]);

    const configuration: ServerConfiguration = {
        '/mock-extension-apis.js': {
            content: apiSource,
            headers: { 'Content-Type': 'text/javascript' }
        },
        '/panel.js': {
            content: jsSource,
            headers: { 'Content-Type': 'text/javascript' }
        }
    };

    const mockExtensionAPIsScript = '<script src="mock-extension-apis.js"></script>';
    const paths: string[] = [];

    for (const state of states) {
        const path = `/${state.name}.html`;
        const disableAnimations = `<style>*{animation: none !important}</style>`;
        const stateString = JSON.stringify(state).replace(/<\/script>/g, '<\\/script>');
        const stateScript = `<script>{window.initialState = ${stateString}; const state = {${state.action}}; state.action()}</script>`;
        const htmlSource = rawHtmlSource.replace(/(<script )/, `${disableAnimations}${stateScript}${mockExtensionAPIsScript}$1`);

        (configuration as any)[path] = htmlSource;
        paths.push(path);
    }

    // Create a temporary server to load the panel content into a browser.
    const server = await Server.create({ configuration });

    const urls = paths.map((path) => {
        return `http://localhost:${server.port}${path}`;
    });

    const urlStrings = urls.map((url) => {
        return `    ${url}`;
    });

    console.log(`Hosting extension UI:\n${urlStrings.join('\n')}`);

    return [server, urls];
};
