import CacxParser from './CacxParser.js';

/**
* Simple fire-and-forget parse + output function
*
* @param {String|Buffer} input The raw input XML to parse
* @param {Object} [options] Additional options to mutate behaviour, see `CacxParser.settings` for details
*
* @returns {Object} The final output object
*/
export default function parse(input, options) {
	return new CacxParser(options)
		.append(input)
		.exec()
		.value()
}
