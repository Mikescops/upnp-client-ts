import et from 'elementtree';
import { Metadata } from '../types';

export const buildMetadata = (metadata: Metadata): string => {
    const didl = et.Element('DIDL-Lite');
    didl.set('xmlns', 'urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/');
    didl.set('xmlns:dc', 'http://purl.org/dc/elements/1.1/');
    didl.set('xmlns:upnp', 'urn:schemas-upnp-org:metadata-1-0/upnp/');
    didl.set('xmlns:sec', 'http://www.sec.co.kr/');

    const item = et.SubElement(didl, 'item');
    item.set('id', '0');
    item.set('parentID', '-1');
    item.set('restricted', 'false');

    const OBJECT_CLASSES = {
        audio: 'object.item.audioItem.musicTrack',
        video: 'object.item.videoItem.movie',
        image: 'object.item.imageItem.photo'
    };

    if (metadata.type) {
        const klass = et.SubElement(item, 'upnp:class');
        klass.text = OBJECT_CLASSES[metadata.type];
    }

    if (metadata.title) {
        const title = et.SubElement(item, 'dc:title');
        title.text = metadata.title;
    }

    if (metadata.creator) {
        const creator = et.SubElement(item, 'dc:creator');
        creator.text = metadata.creator;
    }

    if (metadata.url && metadata.protocolInfo) {
        const res = et.SubElement(item, 'res');
        res.set('protocolInfo', metadata.protocolInfo);
        res.text = metadata.url;
    }

    if (metadata.subtitlesUrl) {
        const captionInfo = et.SubElement(item, 'sec:CaptionInfo');
        captionInfo.set('sec:type', 'srt');
        captionInfo.text = metadata.subtitlesUrl;

        const captionInfoEx = et.SubElement(item, 'sec:CaptionInfoEx');
        captionInfoEx.set('sec:type', 'srt');
        captionInfoEx.text = metadata.subtitlesUrl;

        // Create a second `res` for the subtitles
        const res = et.SubElement(item, 'res');
        res.set('protocolInfo', 'http-get:*:text/srt:*');
        res.text = metadata.subtitlesUrl;
    }

    const doc = new et.ElementTree(didl);
    const xml = doc.write({ xml_declaration: false });

    return xml;
};
