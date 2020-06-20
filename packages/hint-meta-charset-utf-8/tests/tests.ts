import { generateHTMLPage } from '@hint/utils-create-server';
import { getHintPath, HintTest, testHint } from '@hint/utils-tests-helpers';
import { Severity } from '@hint/utils-types';

const metaCharset = '<mEtA CHaRseT="UtF-8">';
const metaHttpEquiv = '<MeTa HTTP-EquiV="ConTent-Type" Content="TexT/HTML; CharSet=UtF-8">';

const metaElementCanBeShorterErrorMessage = `'charset' meta element should be specified using shorter '<meta charset="utf-8">' form.`;
const metaElementHasIncorrectValueErrorMessage = `'charset' meta element value should be 'utf-8'.`;
const metaElementIsNotFirstInHeadErrorMessage = `'charset' meta element should be the first thing in '<head>'.`;
const metaElementIsNotInHeadErrorMessage = `'charset' meta element should be specified in the '<head>', not '<body>'.`;
const metaElementIsNotNeededErrorMessage = `'charset' meta element is not needed as one was already specified.`;
const metaElementNotSpecifiedErrorMessage = `'charset' meta element was not specified.`;

const tests: HintTest[] = [
    {
        name: `'charset' meta element is not specified`,
        reports: [{
            message: metaElementNotSpecifiedErrorMessage,
            severity: Severity.warning
        }],
        serverConfig: generateHTMLPage()
    },
    {
        name: `'http-equiv' meta element is specified`,
        reports: [{
            message: metaElementCanBeShorterErrorMessage,
            severity: Severity.warning
        }],
        serverConfig: generateHTMLPage(metaHttpEquiv)
    },
    {
        name: `'charset' meta element is specified with a value of 'utf8' instead of 'utf-8'`,
        reports: [{
            message: metaElementHasIncorrectValueErrorMessage,
            severity: Severity.warning
        }],
        serverConfig: generateHTMLPage('<meta charset="utf8">')
    },
    {
        name: `'charset' meta element is specified with a value of 'random' instead of 'utf-8'`,
        reports: [{
            message: metaElementHasIncorrectValueErrorMessage,
            severity: Severity.error
        }],
        serverConfig: generateHTMLPage('<meta charset="random">')
    },
    {
        name: `'charset' meta element is specified with the value of 'utf-8'`,
        serverConfig: generateHTMLPage(metaCharset)
    },
    {
        name: `'charset' meta element is specified in the '<body>'`,
        reports: [
            {
                message: metaElementIsNotFirstInHeadErrorMessage,
                severity: Severity.hint
            },
            {
                message: metaElementIsNotInHeadErrorMessage,
                severity: Severity.error
            }
        ],
        serverConfig: generateHTMLPage(undefined, metaCharset)
    },
    {
        name: `'charset' meta element is specified in '<head>' after another element`,
        reports: [{
            message: metaElementIsNotFirstInHeadErrorMessage,
            severity: Severity.hint
        }],
        serverConfig: generateHTMLPage('<title>test</title><meta charset="utf-8">')
    },
    {
        name: `'charset' meta element is specified in '<head>' after an HTML comment`,
        reports: [{
            message: metaElementIsNotFirstInHeadErrorMessage,
            severity: Severity.hint
        }],
        serverConfig: generateHTMLPage('<!-- test --><meta charset="utf-8">')
    },
    {
        name: `'charset' meta element is specified in '<head>' after an HTML comment bigger than 1024 bytes`,
        reports: [{
            message: metaElementIsNotFirstInHeadErrorMessage,
            severity: Severity.error
        }],
        serverConfig: generateHTMLPage(`<!-- test ${' '.repeat(1024)}--><meta charset="utf-8">`)
    },
    {
        name: `Multiple meta 'charset' elements are specified`,
        reports: [{
            message: metaElementIsNotNeededErrorMessage,
            severity: Severity.warning
        }],
        serverConfig: generateHTMLPage(`${metaCharset}${metaHttpEquiv}`)
    },
    {
        name: `Target is served with a non-HTML specific media type`,
        serverConfig: { '/': { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } } }
    },
    {
        name: `Content is injected before meta 'charset' after load should pass`,
        serverConfig: generateHTMLPage(`${metaCharset}
        <script>
            var meta = document.querySelector('meta');
            for(var i = 0; i < 10; i++){
                const script = document.createElement('script');
                meta.parentNode.insertBefore(script, meta);
            }
        </script>`)
    },
    {
        name: `Meta 'charset' is injected after load, should fail`,
        reports: [{
            message: metaElementNotSpecifiedErrorMessage,
            severity: Severity.warning
        }],
        serverConfig: generateHTMLPage(`<title>No charset</title>
        <script>
            var head = document.querySelector('head');
            var meta = document.createElement('meta');
            var title = document.querySelector('title');
            meta.setAttribute('charset', 'utf-8');
            head.insertBefore(meta, title);
        </script>`)
    },
    {
        name: `Resource is not an HTML document`,
        serverConfig: { '/': { headers: { 'Content-Type': 'image/png' } } }
    }
];

testHint(getHintPath(__filename), tests, { parsers: ['html'] });
