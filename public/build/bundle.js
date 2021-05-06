
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Footer.svelte generated by Svelte v3.38.2 */

    const file$2 = "src/Footer.svelte";

    function create_fragment$2(ctx) {
    	let footer;
    	let div1;
    	let div0;
    	let a0;
    	let span0;
    	let t1;
    	let svg0;
    	let path0;
    	let t2;
    	let a1;
    	let span1;
    	let t4;
    	let svg1;
    	let path1;
    	let t5;
    	let a2;
    	let span2;
    	let t7;
    	let svg2;
    	let path2;
    	let t8;
    	let p0;
    	let t10;
    	let p1;
    	let t11;
    	let a3;
    	let t13;
    	let a4;
    	let t15;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			span0 = element("span");
    			span0.textContent = "Twitter";
    			t1 = space();
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t2 = space();
    			a1 = element("a");
    			span1 = element("span");
    			span1.textContent = "GitHub";
    			t4 = space();
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t5 = space();
    			a2 = element("a");
    			span2 = element("span");
    			span2.textContent = "LinkedIn";
    			t7 = space();
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t8 = space();
    			p0 = element("p");
    			p0.textContent = "© None. Do what you like with this page. ✌🏼";
    			t10 = space();
    			p1 = element("p");
    			t11 = text("Built with ");
    			a3 = element("a");
    			a3.textContent = "Svelte";
    			t13 = text("\n            &\n            ");
    			a4 = element("a");
    			a4.textContent = "Cloudflare Pages";
    			t15 = text(" ❤️. I choose Svelte because every other JS framework I tried made me\n            🤮.");
    			attr_dev(span0, "class", "sr-only");
    			add_location(span0, file$2, 9, 16, 337);
    			attr_dev(path0, "d", "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84");
    			add_location(path0, file$2, 16, 20, 588);
    			attr_dev(svg0, "class", "h-6 w-6");
    			attr_dev(svg0, "fill", "currentColor");
    			attr_dev(svg0, "viewBox", "0 0 24 24");
    			attr_dev(svg0, "aria-hidden", "true");
    			add_location(svg0, file$2, 10, 16, 390);
    			attr_dev(a0, "href", "https://twitter.com/jmorf");
    			attr_dev(a0, "class", "text-white hover:text-gray-400");
    			add_location(a0, file$2, 5, 12, 200);
    			attr_dev(span1, "class", "sr-only");
    			add_location(span1, file$2, 26, 16, 1258);
    			attr_dev(path1, "fill-rule", "evenodd");
    			attr_dev(path1, "d", "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z");
    			attr_dev(path1, "clip-rule", "evenodd");
    			add_location(path1, file$2, 33, 20, 1508);
    			attr_dev(svg1, "class", "h-6 w-6");
    			attr_dev(svg1, "fill", "currentColor");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			attr_dev(svg1, "aria-hidden", "true");
    			add_location(svg1, file$2, 27, 16, 1310);
    			attr_dev(a1, "href", "https://github.com/jmorf");
    			attr_dev(a1, "class", "text-white hover:text-gray-400");
    			add_location(a1, file$2, 22, 12, 1122);
    			attr_dev(span2, "class", "sr-only");
    			add_location(span2, file$2, 44, 16, 2578);
    			attr_dev(path2, "fill-rule", "evenodd");
    			attr_dev(path2, "d", "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z");
    			attr_dev(path2, "clip-rule", "evenodd");
    			add_location(path2, file$2, 51, 20, 2830);
    			attr_dev(svg2, "class", "h-6 w-6");
    			attr_dev(svg2, "fill", "currentColor");
    			attr_dev(svg2, "viewBox", "0 0 24 24");
    			attr_dev(svg2, "aria-hidden", "true");
    			add_location(svg2, file$2, 45, 16, 2632);
    			attr_dev(a2, "href", "https://www.linkedin.com/in/morfopoulos/");
    			attr_dev(a2, "class", "text-white hover:text-gray-400");
    			add_location(a2, file$2, 40, 12, 2426);
    			attr_dev(div0, "class", "mt-8 flex justify-center space-x-6");
    			add_location(div0, file$2, 4, 8, 139);
    			attr_dev(p0, "class", "mt-8 text-base");
    			add_location(p0, file$2, 59, 8, 3537);
    			attr_dev(a3, "href", "https://svelte.dev/");
    			attr_dev(a3, "class", "text-white hover:text-gray-400");
    			add_location(a3, file$2, 63, 23, 3695);
    			attr_dev(a4, "href", "https://pages.cloudflare.com/");
    			attr_dev(a4, "class", "text-white hover:text-gray-400");
    			add_location(a4, file$2, 68, 12, 3846);
    			attr_dev(p1, "class", "mt-8 text-sm");
    			add_location(p1, file$2, 62, 8, 3647);
    			attr_dev(div1, "class", "mx-auto max-w-md overflow-hidden sm:max-w-3xl sm:px-6 lg:max-w-7xl lg:px-8");
    			add_location(div1, file$2, 1, 4, 29);
    			attr_dev(footer, "class", "mx-auto");
    			add_location(footer, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, span0);
    			append_dev(a0, t1);
    			append_dev(a0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div0, t2);
    			append_dev(div0, a1);
    			append_dev(a1, span1);
    			append_dev(a1, t4);
    			append_dev(a1, svg1);
    			append_dev(svg1, path1);
    			append_dev(div0, t5);
    			append_dev(div0, a2);
    			append_dev(a2, span2);
    			append_dev(a2, t7);
    			append_dev(a2, svg2);
    			append_dev(svg2, path2);
    			append_dev(div1, t8);
    			append_dev(div1, p0);
    			append_dev(div1, t10);
    			append_dev(div1, p1);
    			append_dev(p1, t11);
    			append_dev(p1, a3);
    			append_dev(p1, t13);
    			append_dev(p1, a4);
    			append_dev(p1, t15);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Companies.svelte generated by Svelte v3.38.2 */

    const file$1 = "src/Companies.svelte";

    function create_fragment$1(ctx) {
    	let p;
    	let t1;
    	let div6;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let div1;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let div2;
    	let img2;
    	let img2_src_value;
    	let t4;
    	let div3;
    	let img3;
    	let img3_src_value;
    	let t5;
    	let div4;
    	let img4;
    	let img4_src_value;
    	let t6;
    	let div5;
    	let img5;
    	let img5_src_value;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Companies I've been involved in";
    			t1 = space();
    			div6 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t2 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t3 = space();
    			div2 = element("div");
    			img2 = element("img");
    			t4 = space();
    			div3 = element("div");
    			img3 = element("img");
    			t5 = space();
    			div4 = element("div");
    			img4 = element("img");
    			t6 = space();
    			div5 = element("div");
    			img5 = element("img");
    			attr_dev(p, "class", "text-center text-xl font-bold tracking-wider");
    			add_location(p, file$1, 0, 0, 0);
    			attr_dev(img0, "class", "max-h-12");
    			if (img0.src !== (img0_src_value = "resume.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Resume.com");
    			add_location(img0, file$1, 5, 8, 232);
    			attr_dev(div0, "class", "col-span-1 flex justify-center py-8 px-8");
    			add_location(div0, file$1, 4, 4, 169);
    			attr_dev(img1, "class", "max-h-12");
    			if (img1.src !== (img1_src_value = "logo.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Logo.com");
    			add_location(img1, file$1, 8, 8, 369);
    			attr_dev(div1, "class", "col-span-1 flex justify-center py-8 px-8");
    			add_location(div1, file$1, 7, 4, 306);
    			attr_dev(img2, "class", "max-h-12");
    			if (img2.src !== (img2_src_value = "domaintools.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Domain Tools");
    			add_location(img2, file$1, 11, 8, 502);
    			attr_dev(div2, "class", "col-span-1 flex justify-center py-8 px-8");
    			add_location(div2, file$1, 10, 4, 439);
    			attr_dev(img3, "class", "max-h-12");
    			if (img3.src !== (img3_src_value = "ocean.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Ocean Networks");
    			add_location(img3, file$1, 14, 8, 646);
    			attr_dev(div3, "class", "col-span-1 flex justify-center py-8 px-8");
    			add_location(div3, file$1, 13, 4, 583);
    			attr_dev(img4, "class", "max-h-12");
    			if (img4.src !== (img4_src_value = "titan.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Titan");
    			add_location(img4, file$1, 17, 8, 786);
    			attr_dev(div4, "class", "col-span-1 flex justify-center py-8 px-8");
    			add_location(div4, file$1, 16, 4, 723);
    			attr_dev(img5, "class", "max-h-12");
    			if (img5.src !== (img5_src_value = "namescon.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "NamesCon");
    			add_location(img5, file$1, 20, 8, 917);
    			attr_dev(div5, "class", "col-span-1 flex justify-center py-8 px-8");
    			add_location(div5, file$1, 19, 4, 854);
    			attr_dev(div6, "class", "mt-6 grid grid-cols-2 gap-0.5 md:grid-cols-3 lg:mt-8");
    			add_location(div6, file$1, 3, 0, 98);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, img0);
    			append_dev(div6, t2);
    			append_dev(div6, div1);
    			append_dev(div1, img1);
    			append_dev(div6, t3);
    			append_dev(div6, div2);
    			append_dev(div2, img2);
    			append_dev(div6, t4);
    			append_dev(div6, div3);
    			append_dev(div3, img3);
    			append_dev(div6, t5);
    			append_dev(div6, div4);
    			append_dev(div4, img4);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, img5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Companies", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Companies> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Companies extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Companies",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let p0;
    	let t2;
    	let div2;
    	let h1;
    	let t4;
    	let div3;
    	let p1;
    	let t6;
    	let div4;
    	let p2;
    	let t8;
    	let div5;
    	let companies;
    	let t9;
    	let div6;
    	let footer;
    	let t10;
    	let meta;
    	let html;
    	let current;
    	companies = new Companies({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Hi 👋🏼";
    			t2 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "I'm James";
    			t4 = space();
    			div3 = element("div");
    			p1 = element("p");
    			p1.textContent = "I like building stuff. Sometimes it works. Mostly it\n\t\t\t\t\t\t\tdoesn't.";
    			t6 = space();
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "I'm a developer, founder, and investor. I've\n\t\t\t\t\t\t\tinvested in more the 50 start-ups and helped build\n\t\t\t\t\t\t\tcompanies in the Cyber Security, HR, Domain Name,\n\t\t\t\t\t\t\tand Brand Protection spaces. I like building new\n\t\t\t\t\t\t\tthings, hacking on side projects, learning from\n\t\t\t\t\t\t\tother peoples mistakes and teaching from my own.";
    			t8 = space();
    			div5 = element("div");
    			create_component(companies.$$.fragment);
    			t9 = space();
    			div6 = element("div");
    			create_component(footer.$$.fragment);
    			t10 = space();
    			meta = element("meta");
    			html = element("html");
    			attr_dev(img, "class", "w-64 md:w-72 lg:w-96 rounded-full ring-4 ring-white object-center mx-auto hover:opacity-25 transition-opacity duration-1000 ease-out");
    			if (img.src !== (img_src_value = "james_slide.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "James Morfopoulos Slide");
    			add_location(img, file, 12, 6, 383);
    			attr_dev(div0, "class", "block");
    			add_location(div0, file, 11, 5, 357);
    			attr_dev(p0, "class", "text-4xl font-semibold tracking-wide");
    			add_location(p0, file, 19, 6, 654);
    			attr_dev(div1, "class", "block");
    			add_location(div1, file, 18, 5, 628);
    			attr_dev(h1, "class", "font-sans mt-1 text-6xl font-bold sm:text-5xl sm:tracking-tight lg:text-6xl");
    			add_location(h1, file, 24, 6, 772);
    			attr_dev(div2, "class", "block");
    			add_location(div2, file, 23, 5, 746);
    			attr_dev(p1, "class", "text-center text-xl font-bold tracking-wider");
    			add_location(p1, file, 31, 6, 947);
    			attr_dev(div3, "class", "block");
    			add_location(div3, file, 30, 5, 921);
    			attr_dev(p2, "class", "text-base");
    			add_location(p2, file, 37, 6, 1134);
    			attr_dev(div4, "class", "block");
    			add_location(div4, file, 36, 5, 1108);
    			attr_dev(div5, "class", "block");
    			add_location(div5, file, 46, 5, 1518);
    			attr_dev(div6, "class", "block");
    			add_location(div6, file, 49, 5, 1575);
    			attr_dev(div7, "class", "space-y-8");
    			add_location(div7, file, 10, 4, 328);
    			attr_dev(div8, "class", "max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8");
    			add_location(div8, file, 9, 3, 256);
    			attr_dev(div9, "class", "container max-w-5xl px-4 mx-auto ");
    			add_location(div9, file, 8, 2, 205);
    			attr_dev(div10, "class", "h-full w-full bg-gray-800 text-white font-sans text-center");
    			add_location(div10, file, 7, 1, 130);
    			add_location(main, file, 6, 0, 122);
    			document.title = "James Morfopoulos";
    			attr_dev(meta, "name", "description");
    			attr_dev(meta, "content", "James Morfopoulos. I like building stuff. Sometimes it works. Mostly it\n\tdoesn't.");
    			add_location(meta, file, 60, 1, 1720);
    			attr_dev(html, "lang", "en");
    			add_location(html, file, 65, 1, 1846);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, img);
    			append_dev(div7, t0);
    			append_dev(div7, div1);
    			append_dev(div1, p0);
    			append_dev(div7, t2);
    			append_dev(div7, div2);
    			append_dev(div2, h1);
    			append_dev(div7, t4);
    			append_dev(div7, div3);
    			append_dev(div3, p1);
    			append_dev(div7, t6);
    			append_dev(div7, div4);
    			append_dev(div4, p2);
    			append_dev(div7, t8);
    			append_dev(div7, div5);
    			mount_component(companies, div5, null);
    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			mount_component(footer, div6, null);
    			insert_dev(target, t10, anchor);
    			append_dev(document.head, meta);
    			append_dev(document.head, html);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(companies.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(companies.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(companies);
    			destroy_component(footer);
    			if (detaching) detach_dev(t10);
    			detach_dev(meta);
    			detach_dev(html);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ Footer, Companies, name });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
