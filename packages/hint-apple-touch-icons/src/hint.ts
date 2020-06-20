/**
 * @fileoverview Check for correct usage of `apple-touch-icon`.
 */
import { imageSize as getImageData } from 'image-size';

import { normalizeString } from '@hint/utils-string';
import { isRegularProtocol } from '@hint/utils-network';
import { debug as d } from '@hint/utils-debug';
import { HintContext, IHint, NetworkData, TraverseEnd } from 'hint';
import { HTMLDocument, HTMLElement } from '@hint/utils-dom';
import { Severity } from '@hint/utils-types';

import meta from './meta';
import { getMessage } from './i18n.import';

const debug: debug.IDebugger = d(__filename);

/*
 * ------------------------------------------------------------------------------
 * Public
 * ------------------------------------------------------------------------------
 */

export default class AppleTouchIconsHint implements IHint {

    public static readonly meta = meta;

    public constructor(context: HintContext) {

        /*
         * This function exists because not all connector (e.g.: jsdom)
         * support matching attribute values case-insensitively.
         *
         * https://www.w3.org/TR/selectors4/#attribute-case
         */

        const getAppleTouchIcons = (elements: HTMLElement[]): HTMLElement[] => {
            return elements.filter((element) => {

                /*
                 * `apple-touch-icon`s can be defined either by using:
                 *
                 *      <link rel="apple-touch-icon" href="...">
                 *
                 *  or
                 *
                 *      <link rel="apple-touch-icon-precomposed" href="...">
                 *
                 *  or, since the `rel` attribute accepts a space
                 *  separated list of values in HTML, theoretically:
                 *
                 *      <link rel="apple-touch-icon-precomposed apple-touch-icon" href="...">
                 *
                 *  but that doesn't work in practice.
                 */

                const relValue = element.getAttribute('rel');

                if (relValue === null) {
                    return false;
                }

                // `normalizeString` won't return null since `relValue` isn't null.
                const relValues = normalizeString(relValue)!.split(' ');

                return relValues.includes('apple-touch-icon') || relValues.includes('apple-touch-icon-precomposed');
            });
        };

        const checkImage = async (appleTouchIcon: HTMLElement, resource: string) => {
            const appleTouchIconHref = normalizeString(appleTouchIcon.getAttribute('href'));

            /*
             * Check if `href` doesn't exist, or it has the
             * value of empty string.
             */

            if (!appleTouchIconHref) {
                const message = getMessage('noEmptyHref', context.language);

                context.report(
                    resource,
                    message,
                    { element: appleTouchIcon, severity: Severity.error });

                return;
            }

            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

            /*
             * The following checks don't make sense for non-HTTP(S).
             */

            if (!isRegularProtocol(resource)) {
                return;
            }

            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

            /*
             * If `href` exists and is not an empty string, try
             * to figure out the full URL of the `apple-touch-icon`.
             */

            const appleTouchIconURL = appleTouchIcon.resolveUrl(appleTouchIconHref);

            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

            let networkData: NetworkData;

            /*
             * Try to see if the `apple-touch-icon` file actually
             * exists and is accesible.
             */

            try {
                networkData = await context.fetchContent(appleTouchIconURL);
            } catch (e) {
                debug(`Failed to fetch the ${appleTouchIconHref} file`);

                const message = getMessage('couldNotBeFetch', context.language);

                context.report(
                    resource,
                    message,
                    { element: appleTouchIcon, severity: Severity.error }
                );

                return;
            }

            const response = networkData.response;

            if (response.statusCode !== 200) {
                const message = getMessage('couldNotBeFetchErrorStatusCode', context.language, response.statusCode.toString());

                context.report(
                    resource,
                    message,
                    { element: appleTouchIcon, severity: Severity.error }
                );

                return;
            }

            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

            let image;

            /*
             * Notes:
             *
             *  * Async version of `image-size` doesn't work if the
             *    input is a Buffer.
             *
             *    https://github.com/image-size/image-size/tree/4c527ba608d742fbb29f6d9b3c77b831b069cbb2#asynchronous
             *
             * * `image-size` will throw a `TypeError` error if it does
             *    not understand the file type or the image is invalid
             *    or corrupted.
             */

            try {
                image = getImageData(response.body.rawContent);
            } catch (e) {
                if (e instanceof TypeError) {
                    const message = getMessage('invalidPNG', context.language);

                    context.report(
                        resource,
                        message,
                        { element: appleTouchIcon, severity: Severity.error }
                    );
                } else {
                    debug(`'getImageData' failed for '${appleTouchIconURL}'`);
                }

                return;
            }

            // Check if the image is a PNG.

            if (image.type !== 'png') {
                const message = getMessage('shouldBePNG', context.language);

                context.report(
                    resource,
                    message,
                    { element: appleTouchIcon, severity: Severity.error }
                );
            }

            // Check if the image is 180x180px.

            if (image.width !== 180 || image.height !== 180) {
                const message = getMessage('wrongResolution', context.language);

                context.report(
                    resource,
                    message,
                    { element: appleTouchIcon, severity: Severity.warning }
                );
            }

            // TODO: Check if the image has some kind of transparency.
        };

        const chooseBestIcon = (icons: HTMLElement[]): HTMLElement => {

            /*
             * Site will usually have something such as:
             *
             * <link rel="apple-touch-icon" sizes="60x60" href="/apple-touch-icon-60x60.png">
             * <link rel="apple-touch-icon" sizes="72x72" href="/apple-touch-icon-72x72.png">
             * <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon-76x76.png">
             * <link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icon-114x114.png">
             * <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png">
             * <link rel="apple-touch-icon" sizes="144x144" href="/apple-touch-icon-144x144.png">
             * <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png">
             * <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png">
             * <link rel="apple-touch-icon" href="/apple-touch-icon-57x57.png">
             *
             * so what this function will try to do is select the
             * icon that will most likely generate the fewest errors.
             */

            let bestIcon;

            for (const icon of icons) {
                const sizes = normalizeString(icon.getAttribute('sizes'));

                if (sizes === '180x180') {
                    return icon;
                } else if (!sizes) {
                    bestIcon = icon;
                }
            }

            return bestIcon || icons[0];
        };

        const validate = async ({ resource }: TraverseEnd) => {
            const pageDOM = context.pageDOM as HTMLDocument;
            const appleTouchIcons = getAppleTouchIcons(pageDOM.querySelectorAll('link'));

            const linksToManifest = pageDOM.querySelectorAll('link[rel="manifest"]').length > 0;

            if (appleTouchIcons.length === 0) {
                if (linksToManifest) {
                    context.report(
                        resource,
                        getMessage('noElement', context.language),
                        { severity: Severity.error });
                }

                return;
            }

            /*
             * Choose the icon that will most likely
             * pass most of the following tests.
             */

            const appleTouchIcon: HTMLElement = chooseBestIcon(appleTouchIcons);

            /*
             * Check if `rel='apple-touch-icon'`.
             * See `getAppleTouchIcons` function for more details.
             */

            if (normalizeString(appleTouchIcon.getAttribute('rel')) !== 'apple-touch-icon') {
                const message = getMessage('wrongRelAttribute', context.language);

                context.report(
                    resource,
                    message,
                    { element: appleTouchIcon, severity: Severity.warning }
                );
            }

            /*
             * Since we are recommending one icon, the `sizes` attribute
             * is not needed. Also, pre-4.2 versions of iOS ignore the
             * `sizes` attribute.
             *
             * https://mathiasbynens.be/notes/touch-icons
             * https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes
             */

            if (appleTouchIcon.getAttribute('sizes')) {
                const message = getMessage('sizesAttribute', context.language);

                context.report(
                    resource,
                    message,
                    { element: appleTouchIcon, severity: Severity.warning }
                );
            }

            /*
             * Check if the `apple-touch-icon` exists, is the right
             * image format, the right size, etc.
             */

            await checkImage(appleTouchIcon, resource);

            /*
             * Check if the `apple-touch-icon` is included in the `<body>`.
             */

            const bodyAppleTouchIcons: HTMLElement[] = getAppleTouchIcons(pageDOM.querySelectorAll('body link'));

            for (const icon of bodyAppleTouchIcons) {
                if (icon.isSame(appleTouchIcon)) {
                    const message = getMessage('elementNotInHead', context.language);

                    context.report(
                        resource,
                        message,
                        { element: appleTouchIcon, severity: Severity.error }
                    );
                }
            }

            /*
             * All other `apple-touch-icon`s should not be included.
             */

            for (const icon of appleTouchIcons) {
                if (!icon.isSame(appleTouchIcon)) {
                    const message = getMessage('elementDuplicated', context.language);

                    context.report(
                        resource,
                        message,
                        { element: icon, severity: Severity.warning }
                    );
                }
            }
        };

        context.on('traverse::end', validate);
    }
}
