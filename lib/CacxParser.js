const debug = (...msg) => {
	// console.log('[CACX]', ...msg);
}

export default class CacxParser {

	/**
	* Options relevent to this parser instance
	*
	* @type {Object}
	*
	* @property {Boolean} collect If truthy, collect the root value of the stack as a meta object representing the entire structure. Disable this if you intend to stream large objects and prefer an emitter pattern
	* @property {String} keyContent The key used to store raw text content of an XML tag
	* @property {RegExp} reTagDetect The regular expression used to detect opening/closing XML tags. Must export {prefix, tagClose, tag} groups
	*
	* @property {Function} onRoot Function to call when detecting the root node, onTagOpen is still called after this
	* @property {Function} onTagOpen Function to call when detecting an opening node
	* @property {Function} onTagClose Function to call when detecting a closing node
	*/
	settings = {
		collect: true,
		keyText: 'text',
		keyAttrs: '@',
		reNextSegment: /(?<text>.*?)<(?<isClose>\/?)(?<tag>[a-z0-9-\.\_]+?)(?:\s+(?<attrs>.*?))?>/ig,
		onRoot: node => debug('> ROOT', node.tag),
		onTagOpen: node => debug('> TAG OPEN', node.tag),
		onTagClose: node => debug('> TAG CLOSE', node.tag),
		onTagCloseMismatch: (tag, expectedTag) => debug('TAG CLOSE', tag, '(but expected', expectedTag, ')'),
	};


	buffer = '';


	_value;


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
		let match; // Match we are working on
		let matchOffset = 0; // Offset match we found
		let lastMatchOffset; // The offset (within this.buffer) of the last match + match length) to truncate to

		// Keep probing the regex until it returns null (exhausted)
		while (match = this.settings.reNextSegment.exec(this.buffer)) {
			lastMatchOffset = match.index + match[0].length; // Stash last match ending, so we can truncate the buffer

			// Parse attrs (if any)
			let attrs = {}; // FIXME: ATTR extraction not yet supported

			// Process handing text
			if (match.groups.text) {
				if (this.stack.length == 0) throw new Error('Attempt to set value on empty stack!');

				this.stack.at(-1)[this.settings.keyText] =
					(this.stack.at(-1)[this.settings.keyText] || '')
					+ match.groups.text;
			}

			if (match.groups.isClose == '') { // Opening tag
				let node = {
					tag: match.groups.tag,
					...(Object.keys(attrs).length > 0 && {
						[this.settings.keyAttrs]: attrs,
					}),
				};

				if (this.stack.length == 0) { // Root tag and we're in collect mode
					this.settings.onRoot(node);

					if (this.settings.collect) // We're also constructing a structure
						this._value = node;
				} else { // Append to existing stack
					if (!this.stack.at(-1).children) { // Parent has no children yet
						this.stack.at(-1).children = [node];
					} else { // Parent has existing children
						this.stack.at(-1).children.push(node);
					}
				}

				this.settings.onTagOpen(node);
				this.stack.push(node);
			} else if (match.groups.isClose == '/') { // Closing tag
				if (this.stack.length == 0) {
					throw new Error('Smashed stack!');
				} else {
					this.settings.onTagClose(this.stack.at(-1));
					this.stack.pop();
				}
			} else {
				debug('OUT OF BAND', {match});
			}
		}
		if (lastMatchOffset > 0)
			debug('TRUNCATE', lastMatchOffset);
		this.buffer = this.buffer.slice(lastMatchOffset);
		debug('BUF NOW', {buf: this.buffer});

		/*
		while (true) // Process buffer unti exhausted
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
			}
		}
		debug('REMAINS [[[', this.buffer, ']]]');
		*/

		return this;
	}


	value() {
		if (!this.settings.collect) throw new Error('Collect mode disabled, enable this if you want the final parsed output object');
		debug('GIVE VALUE', this._value);
		return this._value;
	}
}


