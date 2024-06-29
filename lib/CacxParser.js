const debug = (...msg) => {
	// console.log('CACX', ...msg);
}

export default class CacxParser {

	/**
	* Options relevent to this parser instance
	*
	* @type {Object}
	*
	* @property {String} keyContent The key used to store raw text content of an XML tag
	* @property {RegExp} reTagDetect The regular expression used to detect opening/closing XML tags. Must export {prefix, tagClose, tag} groups
	* @property {Function} onTagOpen Function to call when detecting an opening tag. Called as `(tag:String)`
	* @property {Function} onTagClose Function to call when detecting a closing tag which mismatches with what was expected. Called as `(tag:String)`
	*/
	settings = {
		keyContent: 'text',
		reTagDetect: /(?<prefix>.*?)<(?<tagClose>\/)?(?<tag>.+?>?)>/d,
		onTagOpen: tag => debug('TAG OPEN', tag),
		onTagClose: tag => debug('TAG CLOSE', tag),
		onTagCloseMismatch: (tag, expectedTag) => debug('TAG CLOSE', tag, '(but expected', expectedTag, ')'),
	};


	buffer = '';


	_value = [];


	stack = [];


	/**
	* CacxParser + options populator
	* @param {Object} [options] Additional options to mutate behaviour, See `CacxParser.settings` for details
	*/
	constructor(options) {
		if (options) Object.assign(this.settings, options);
	}


	/**
	* Append input into the parsing buffer and return self
	*
	* @param {String|Buffer} input The input to append to the buffer
	*
	* @returns {CacxParser} Chainable parser instance
	*/
	append(input) {
		if (!input) throw new Error('No input to append');
		this.buffer += input.toString();
		return this;
	}


	/**
	* Empty the current buffer (as far as thats possible) into the processable output
	*
	* @returns {CacxParser} Chainable parser instance
	*/
	exec() {
		while (true) { // Process buffer unti exhausted
			debug('--- LOOP ---');
			debug('BUFFER:', '[[[', this.buffer, ']]]');
			let match = this.settings.reTagDetect.exec(this.buffer);

			if (match) { // Found tag within buffer
				debug('RAW TAG', match);
				let {tag} = match.groups;

				if (match.groups.prefix) { // There is some content before the start/close of the next tag
					this.stack.at(-1)[this.settings.keyContent] = (this.stack.at(-1)[this.settings.keyContent] ?? '') + match.groups.prefix;
				}

				if (!match.groups.tagClose) { // Opening tag
					this.settings.onTagOpen(tag);
					this.buffer = this.buffer.slice(match.index + match[0].length);
					this.stack.push({
						tag,
					});
					debug('POST TAG', match.groups.tag, '=[[[', this.buffer, ']]]');
				} else { // Closing tag
					this.buffer = this.buffer.slice(match.index + match[0].length);
					let expectTag = this.stack.at(-1).tag;
					if (expectTag == tag) { // Non-well formed closing tag
						this.settings.onTagClose(tag);
					} else {
						this.settings.onTagCloseMismatch(tag, expectTag);
					}
					// this.stack.pop();
				}
			} else { // Found nothing - buffer likely exhausted, exit
				debug('EXHAUSTED', '[[[', this.buffer, ']]]');
				break;
			}
		}
		debug('REMAINS [[[', this.buffer, ']]]');

		return this;
	}


	value() {
		debug('GIVE STACK', this.stack);
		return this.stack;
	}
}


