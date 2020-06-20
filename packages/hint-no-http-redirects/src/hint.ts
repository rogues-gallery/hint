/**
 * @fileoverview Checks if there are unnecesary redirects when accessign resources
 */

import { HintContext } from 'hint/dist/src/lib/hint-context';
// The list of types depends on the events you want to capture.
import { IHint, FetchEnd } from 'hint/dist/src/lib/types';
import { Severity } from '@hint/utils-types';

import meta from './meta';
import { getMessage } from './i18n.import';

/*
 * ------------------------------------------------------------------------------
 * Public
 * ------------------------------------------------------------------------------
 */

export default class NoHttpRedirectHint implements IHint {

    public static readonly meta = meta;

    public constructor(context: HintContext) {

        /** The maximum number of hops for a resource. */
        const maxResourceHops: number = context.hintOptions && context.hintOptions['max-resource-redirects'] || 0;
        /** The maximum number of hops for the html. */
        const maxHTMLHops: number = context.hintOptions && context.hintOptions['max-html-redirects'] || 0;

        /**
         * Returns a function that will validate if the number of hops is within the limit passed by `maxHops`.
         * If it doesn't validate, it will notify the context.
         *
         * Ex.: `validateRequestEnd(10)(fetchEnd)` will verify if the event `fetchEnd` has had less than 10 hops.
         */
        const validateRequestEnd = (fetchEnd: FetchEnd, eventName: string) => {
            const maxHops: number = eventName === 'fetch::end::html' ? maxHTMLHops : maxResourceHops;
            const { request, response, element } = fetchEnd;

            if (response.hops.length > maxHops) {
                const message = getMessage('redirectsDectected', context.language, maxHops.toString());

                context.report(request.url, message, { element, severity: Severity.warning });
            }
        };

        context.on('fetch::end::*', validateRequestEnd);
    }
}
