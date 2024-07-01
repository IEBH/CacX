import CacxParser from './CacxParser.js';
import {createReadStream} from 'node:fs';

/**
* Stream a file content into the parser, execute a function whenever the named tag closes
* To save memory this function disables collection so calls to `value()` will throw
*
* @param {String} file The file path to parse
* @param {Object<Function>} tags Functions to run on closing each named tag
* @param {Object} [options] Additional options to mutate behaviour, see `CacxParser.settings` for details
*
* @returns {Promise} A promise which will resolve when the stream has closed
*/
export default function parseCollectionFile(path, tags, options) {
	let parser = new CacxParser({
		collect: false,
		onTagClose(rawNode) {
			if (!(rawNode.tag in tags)) return; // Not interested in this tag

			// Call the callback with the evaluated node
			tags[rawNode.tag](options.flatten // Optionally flatten the output
				? parser.flatten(rawNode)
				: rawNode
			);
		},
		...options,
	});

	return new Promise((resolve, reject) => {
		let stream = createReadStream(path, {encoding: 'utf8'});

		stream.on('data', chunk => parser.append(chunk.toString()).exec());
		stream.on('end', ()=> resolve())
		stream.on('error', reject);
	})
}
