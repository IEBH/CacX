import CacxParser from './CacxParser.js';
import {createReadStream} from 'node:fs';

/**
* Stream a file content into the parser, returning the eventual result
* @param {String} file The file path to parse
* @param {Object} [options] Additional options to mutate behaviour, see `CacxParser.settings` for details
*
* @returns {Promise<Object>} A promise which will resolve to the final output object
*/
export default function parseFile(path, options) {
	let parser = new CacxParser(options);

	return new Promise((resolve, reject) => {
		let stream = createReadStream(path, {encoding: 'utf8'});

		stream.on('data', chunk => parser.append(chunk.toString()).exec());
		stream.on('end', ()=> resolve())
		stream.on('error', reject);
	})
		.then(()=> parser.value())
}
