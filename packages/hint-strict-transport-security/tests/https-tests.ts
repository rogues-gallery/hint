import { getHintPath, HintTest, testHint } from '@hint/utils-tests-helpers';
import { Severity } from '@hint/utils-types';

import * as common from './_common';

const hintPath = getHintPath(__filename);

const defaultTests: HintTest[] = [
    {
        name: `HTML page is served over HTTPS without 'Strict-Transport-Security' header specified`,
        reports: [{
            message: common.noHeaderError,
            severity: Severity.error
        }],
        serverConfig: common.faviconHeaderMaxAgeOnly

    },
    {
        name: `Resource is served over HTTPS without 'Strict-Transport-Security' header specified`,
        reports: [{
            message: common.noHeaderError,
            severity: Severity.error
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': common.htmlPageWithScriptData,
            '/test.js': ''
        }
    },
    {
        name: `HTML pages is served over HTTPS and 'max-age' defined is too short`,
        reports: [{
            message: common.tooShortErrorDefault,
            severity: Severity.warning
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.tooShortHeader }
        }
    },
    {
        name: `Resource is served over HTTPS and 'max-age' defined is too short`,
        reports: [{
            message: common.tooShortErrorDefault,
            severity: Severity.warning
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': common.htmlPageWithScriptData,
            '/test.js': { headers: common.tooShortHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header with 'max-age' bigger than minimum`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.maxAgeOnlyHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header contains 'includeSubDomains'`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.includeSubDomainsHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header contains 'preload'`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.preloadHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header has no 'max-age' directive`,
        reports: [{
            message: common.noMaxAgeError,
            severity: Severity.error
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.noMaxAgeHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header has a 'max-age' directive in mix cases`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.mixCaseHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header has multiple 'max-age' directives`,
        reports: [{
            message: common.duplicateDirectivesError,
            severity: Severity.warning
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.multipleMaxAgeHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header has multiple 'includeSubdomains' directives`,
        reports: [{
            message: common.duplicateDirectivesError,
            severity: Severity.warning
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.multipleincludeSubDomainsHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header has the wrong delimiter`,
        reports: [{
            message: common.wrongFormatError,
            severity: Severity.error
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.wrongDelimiterHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header that includes letters in the 'max-age' value`,
        reports: [{
            message: common.wrongFormatError,
            severity: Severity.error
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.includeUnitMaxAgeHeader }
        }
    },
    {
        name: `'Strict-Transport-Security' header that wraps 'max-age' value in quotes`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.quotedStringHeader }
        }
    }
];

const configMaxAgeTests: HintTest[] = [{
    name: `Change the minimum max-age value`,
    // the max-age that passes before is now too short
    reports: [{
        message: common.generateTooShortError(common.OkayMaxAge + 1),
        severity: Severity.warning
    }],
    serverConfig: {
        ...common.faviconHeaderMaxAgeOnly,
        '/': { headers: common.maxAgeOnlyHeader }
    }
}];

const configPreloadTets: HintTest[] = [
    {
        name: `The 'Strict-Transport-Security' header doesn't have 'preload' attribute`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.maxAgeOnlyHeader }
        }
    },
    {
        before() {
            common.requestJSONAsyncMock({ status: common.preloaded });
        },
        name: `The site is already on the preload list`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.preloadHeader }
        }
    },
    {
        before() {
            common.requestJSONAsyncMock({ preloadable: common.noErrors, status: common.unknown });
        },
        name: `The site is not on the preload list, and is qualified to be enrolled`,
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.preloadHeader }
        }
    },
    {
        before() {
            common.requestJSONAsyncMock({ preloadable: common.hasErrors, status: common.unknown });
        },
        name: `The site is not on the preload list, and it isn't qualified to be enrolled`,
        reports: [{
            message: common.notPreloadableError,
            severity: Severity.error
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.preloadHeader }
        }
    },
    {
        before() {
            common.requestJSONAsyncMock({ preloadable: common.hasErrors, status: null });
        },
        name: `Service error with the preload status endpoint`,
        reports: [{
            message: common.statusServiceError,
            severity: Severity.error
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.preloadHeader }
        }
    },
    {
        before() {
            common.requestJSONAsyncMock({ preloadable: null, status: common.unknown });
        },
        name: `Service error with the preload eligibility endpoint`,
        reports: [{
            message: common.preloadableServiceError,
            severity: Severity.error
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.preloadHeader }
        }
    },
    {
        before() {
            common.requestJSONAsyncMock({ status: { status: null } });
        },
        name: `There's a problem with the verification endpoint`,
        reports: [{
            message: common.problemWithVerificationEndpoint,
            severity: Severity.warning
        }],
        serverConfig: {
            ...common.faviconHeaderMaxAgeOnly,
            '/': { headers: common.preloadHeader }
        }
    }
];

testHint(hintPath, defaultTests, { https: true });
testHint(hintPath, configMaxAgeTests, {
    hintOptions: { minMaxAgeValue: common.OkayMaxAge + 1 },
    https: true
});
testHint(hintPath, configPreloadTets, {
    hintOptions: { checkPreload: true },
    https: true,
    serial: true
});
