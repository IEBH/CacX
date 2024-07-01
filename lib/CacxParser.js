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
	*
	* @property {String} keyText The key used to store raw text / value content of an XML tag e.g. `<a>This is content</a>`
	* @property {String} keyAttrs The key used to store node attributes of an XML tag
	*
	* @property {Boolean} ignoreOrphanedPrefixes Ignore text which appears orphaned before the XML body begins. This is likely the XML preface anyway
	* @property {RegExp} reNextSegment The regular expression used to detect opening/closing XML tags. Must export `{text:Any, isClose:Any, tag:String, attrs:String}` groups
	* @property {RegExp} reAttrSegment The regular expression used to parse attribute leftovers within a tag. Must export `{key:String, escape:String, val:Any}` groups
	*
	* @property {Function} onRoot Function to call when detecting the root node, onTagOpen is still called after this
	* @property {Function} onAttr Function to parse a key=val atrribute as parsed from `settings.reAttrSegment`. Called as `(key:String, val:Any, options:Object)` where options are all groups extracted
	* @property {Function} onTagOpen Function to call when detecting an opening node
	* @property {Function} onTagClose Function to call when detecting a closing node
	*/
	settings = {
		collect: true,
		keyText: 'text',
		keyAttrs: 'attrs',
		keyChildren: 'children',
		ignoreOrphanedPrefixes: true,
		flattenText: true,
		flattenChildren: true,
		flattenChildrenSquish: true,
		flattenAttrs: true,
		reNextSegment: /(?<text>.*?)<(?<isClose>\/?)(?<tag>[a-z0-9-\.\_]+?)(?:\s+(?<attrs>.*?))?>/ig,
		reAttrSegment: /(?<key>[a-z0-9\.\_]+?)(?:=(?<escape>["'])?(?<val>.+?)\k<escape>)?\w?/ig,
		onRoot: node => debug('> ROOT', node.tag),
		onAttr: (key, val, options) => ({
			[key]: isFinite(val) ? +val
				: val === 'true'  || val === undefined ? true
				: val === 'false'? false
				: val,
		}),
		onTagOpen: node => debug('> TAG OPEN', node.tag),
		onTagClose: node => debug('> TAG CLOSE', node.tag),
		onTagCloseMismatch: (tag, expectedTag) => debug('TAG CLOSE', tag, '(but expected', expectedTag, ')'),
	};



	/**
	* Current string buffer for incoming content
	* This can be an incomplete rendering of the XML file to be parsed
	* Calls to `exec()` will drain and truncate this back to the nearest processable node
	* @type {String}
	*/
	buffer = '';


	/**
	* If `settings.collect` is truthy this represents an in-memory rendering of the root node with children
	* @type {Object{
	*/
	collected;


	/**
	* The current processing stack
	* This is a FILO array of nodes from the root element downwards as the XML stream is digrested
	* Each value is a node, the format of which is dicated by the key arrangement in `settings`
	* @type {Array<Object>}
	*/
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
		let lastMatchOffset; // The offset (within this.buffer) of the last match + match length) to truncate to

		// Keep probing the regex until it returns null (exhausted)
		while (match = this.settings.reNextSegment.exec(this.buffer)) {
			lastMatchOffset = match.index + match[0].length; // Stash last match ending, so we can truncate the buffer

			// Process handing text
			if (match.groups.text) {
				if (this.stack.length == 0 && this.settings.ignoreOrphanedPrefixes) {
					// Pass
				} else if (this.stack.length == 0) {
					throw new Error('Attempt to set value on empty stack!');
				} else {
					this.stack.at(-1)[this.settings.keyText] =
						(this.stack.at(-1)[this.settings.keyText] || '')
						+ match.groups.text;
				}
			}

			// Parse attrs (if any)
			let attrs = match.groups.attrs
				? this.parseAttrString(match.groups.attrs)
				: null;

			if (match.groups.isClose == '') { // Opening tag
				let node = {
					tag: match.groups.tag,
					...(attrs !== null && {
						[this.settings.keyAttrs]: attrs,
					}),
				};

				if (this.stack.length == 0) { // Root tag and we're in collect mode
					this.settings.onRoot(node);

					if (this.settings.collect) // We're also constructing a structure
						this.collected = node;
				} else { // Append to existing stack
					if (!this.stack.at(-1)[this.settings.keyChildren]) { // Parent has no children yet
						this.stack.at(-1)[this.settings.keyChildren] = [node];
					} else { // Parent has existing children
						this.stack.at(-1)[this.settings.keyChildren].push(node);
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

		// Truncate string buffer to the last position of the last tag we saw
		if (lastMatchOffset > 0)
			this.buffer = this.buffer.slice(lastMatchOffset);

		return this;
	}


	/**
	* Parse a raw attribute string into an object of values
	* This parses all incoming attribute key=val pairs via the `settings.onAttr` logic
	*
	* @param {String} attrString The raw attribute string to parse
	* @returns {Object} The output object
	*/
	parseAttrString(attrString) {
		let match;
		let attrs = {};

		while (match = this.settings.reAttrSegment.exec(attrString)) {
			attrs = {
				...attrs,
				...this.settings.onAttr(match.groups.key, match.groups.val, match.groups),
			};
		}
		return attrs;
	}


	/**
	* Rewrite the collected node tree to use tags as objects
	*
	* @param {Object} [rootNode] The node structure to flatten, if omitted the currently collected root node is rewritten in place
	*
	* @returns {CacxParser|Object} If no node is provided this returns the chainable parser instance, if a node is provided the flattend node structure is returned
	*/
	flatten(rootNode) {
		let flatWorker = (node) => {
			if (Array.isArray(node)) {
				return node.map(n => flatWorker(n));
			} else if (typeof node == 'object' && node.tag) {
				if (this.settings.flattenText && node[this.settings.keyText] && !node[this.settings.keyChildren] && !node[this.settings.keyAttrs]) { // Text only
					return {[node.tag]: node[this.settings.keyText]};
				} else if (this.settings.flattenChildren && node[this.settings.keyChildren] && !node[this.settings.keyText] && !node[this.settings.keyAttrs]) { // Children only
					let flatChildren = flatWorker(node[this.settings.keyChildren]);
					if (this.settings.flattenChildrenSquish && flatChildren.length == 1)
						flatChildren = flatChildren[0];
					return {[node.tag]: flatChildren};
				} else if (this.settings.flattenAttrs && node[this.settings.keyAttrs] && !node[this.settings.keyChildren] && !node[this.settings.keyText]) { // Attributes only
					return {[node.tag]: node[this.settings.keyAttrs]};
				} else { // Mix of text / attrs / children
					return {[node.tag]: {
						...(node[this.settings.keyText] && {[this.settings.keyText]: node[this.settings.keyText]}),
						...(node[this.settings.keyAttrs] && {[this.settings.keyAttrs]: node[this.settings.keyAttrs]}),
						...(node[this.settings.keyChildren] && {[this.settings.keyChildren]: node[this.settings.keyChildren]}),
					}};
				}
			}
		};

		if (rootNode) { // Work on given structure
			return flatWorker(rootNode);
		} else {
			this.collected = flatWorker(this.collected);
			return this;
		}
	}


	/**
	* Return the parsed, block object of the XML
	* Should `settings.collect` be falsy this function will throw
	*
	* @returns {Object} An object representing the parsed XML structure against the configuration of `settings`
	*/
	value() {
		if (!this.settings.collect) throw new Error('Collect mode disabled, enable this if you want the final parsed output object');

		if (this.settings.flatten) this.flatten();

		return this.collected;
	}
}


