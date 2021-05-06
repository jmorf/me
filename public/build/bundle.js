
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
    function xlink_attr(node, attribute, value) {
        node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
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
    	let svg;
    	let defs;
    	let polygon;
    	let g4;
    	let g3;
    	let g2;
    	let path0;
    	let path1;
    	let g1;
    	let mask;
    	let use;
    	let g0;
    	let path2;
    	let path3;
    	let path4;
    	let t2;
    	let div1;
    	let img0;
    	let img0_src_value;
    	let t3;
    	let div2;
    	let img1;
    	let img1_src_value;
    	let t4;
    	let div3;
    	let img2;
    	let img2_src_value;
    	let t5;
    	let div4;
    	let img3;
    	let img3_src_value;
    	let t6;
    	let div5;
    	let img4;
    	let img4_src_value;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Companies I've been involved in";
    			t1 = space();
    			div6 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			polygon = svg_element("polygon");
    			g4 = svg_element("g");
    			g3 = svg_element("g");
    			g2 = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			g1 = svg_element("g");
    			mask = svg_element("mask");
    			use = svg_element("use");
    			g0 = svg_element("g");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			t2 = space();
    			div1 = element("div");
    			img0 = element("img");
    			t3 = space();
    			div2 = element("div");
    			img1 = element("img");
    			t4 = space();
    			div3 = element("div");
    			img2 = element("img");
    			t5 = space();
    			div4 = element("div");
    			img3 = element("img");
    			t6 = space();
    			div5 = element("div");
    			img4 = element("img");
    			attr_dev(p, "class", "text-center text-base font-semibold uppercase tracking-wider");
    			add_location(p, file$1, 0, 0, 0);
    			attr_dev(polygon, "id", "path-1");
    			attr_dev(polygon, "points", "0.06 0.434 266.21 0.434 266.21 58.94 0.06 58.94");
    			add_location(polygon, file$1, 14, 16, 512);
    			add_location(defs, file$1, 13, 12, 489);
    			attr_dev(path0, "d", "M168.555,40.613 C168.241,39.973 168.052,38.242 168.052,35.744 L168.052,15.115 L166.231,15.115 C165.351,15.115 164.22,15.18 162.776,15.18 C159.383,15.18 158.629,15.115 156.368,15.051 L156.368,18.19 L157.499,18.319 C160.263,18.638 160.891,19.152 160.891,21.906 L160.891,31.9 C160.891,35.166 160.514,36.961 159.383,38.434 C158.19,40.035 156.305,40.869 154.106,40.869 C152.222,40.869 150.526,40.229 149.458,39.139 C148.203,37.859 148.014,36.832 148.014,32.926 L148.014,15.115 C145.877,15.18 145.187,15.18 142.925,15.18 C139.721,15.18 138.967,15.115 136.832,15.051 L136.832,18.19 C137.271,18.254 137.648,18.254 137.836,18.319 C140.475,18.446 141.041,19.152 141.041,21.906 L141.041,33.438 C141.041,38.627 141.668,40.934 143.491,42.791 C145.5,44.842 148.328,45.865 151.844,45.865 C154.546,45.865 156.808,45.225 158.441,44.07 C159.509,43.24 160.011,42.791 161.645,40.934 L161.645,45.033 L164.094,44.969 C165.728,44.904 166.733,44.904 167.235,44.904 C167.738,44.904 168.743,44.904 170.376,44.969 L171.022,45 L171.022,41.875 C169.329,41.734 168.918,41.354 168.555,40.613 Z M233.665,27.479 C234.041,23.893 234.668,22.163 236.24,20.561 C237.621,19.086 239.381,18.319 241.517,18.319 C246.102,18.319 248.552,21.458 248.677,27.479 L233.665,27.479 Z M256.152,29.145 C256.152,19.665 250.688,14.155 241.265,14.155 C231.593,14.155 225.813,20.176 225.813,30.17 C225.813,39.973 231.779,45.865 241.58,45.865 C246.164,45.865 249.306,44.842 251.881,42.471 C253.829,40.613 254.582,39.396 255.524,36.065 L250.123,36.065 C248.426,39.844 246.164,41.318 242.333,41.318 C238.627,41.318 235.675,39.524 234.355,36.512 C233.79,35.166 233.602,34.207 233.539,31.772 L256.09,31.772 C256.152,30.554 256.152,29.722 256.152,29.145 Z M224.002,35.744 L224.002,26.326 C224.002,20.689 223.1,18.19 220.336,16.268 C218.342,14.859 215.898,14.155 212.941,14.155 C210.305,14.155 207.99,14.731 206.189,15.948 C204.839,16.846 204.196,17.421 202.332,19.471 C201.238,17.678 200.723,16.973 199.565,16.141 C197.83,14.859 195.386,14.155 192.623,14.155 C188.187,14.155 185.42,15.5 182.334,19.28 L182.334,15.18 L177.898,15.18 C176.547,15.18 175.261,15.244 172.689,15.115 L171.394,15.051 L171.523,18.063 C172.102,18.127 172.367,18.19 172.689,18.19 C174.297,18.319 175.068,18.638 175.455,19.409 C175.839,20.176 175.904,20.432 175.904,23.379 L175.904,35.744 C175.904,38.818 175.776,39.973 175.39,40.678 C174.94,41.445 174.279,41.766 172.479,41.895 C172.319,41.934 172.451,41.951 172.191,41.971 L172.191,45.024 L172.209,45.024 L172.211,45.033 L172.211,45.018 L174.747,44.969 C177.19,44.904 178.733,44.904 179.504,44.904 C180.277,44.904 181.885,44.904 184.263,44.969 L187.801,45.033 L187.801,42.021 C187.285,41.957 186.964,41.957 186.707,41.895 C183.492,41.701 183.235,41.125 183.235,35.744 L183.235,27.928 C183.235,23.763 183.942,21.779 186,20.305 C187.157,19.471 188.637,19.024 190.181,19.024 C192.623,19.024 194.871,20.241 195.58,22.098 C196.029,23.188 196.224,24.853 196.224,27.223 L196.224,35.744 C196.224,41.19 195.901,41.701 192.687,41.895 C192.431,41.957 192.109,41.957 191.595,42.021 L191.595,45.033 L195.193,44.969 C197.572,44.904 199.116,44.904 199.823,44.904 C200.53,44.904 202.139,44.904 204.519,44.969 L208.118,45.033 L208.118,42.021 C207.604,41.957 207.281,41.957 207.025,41.895 C203.811,41.701 203.489,41.19 203.489,35.744 L203.489,27.992 C203.489,23.829 204.324,21.779 206.574,20.241 C207.797,19.471 209.212,19.024 210.755,19.024 C213.263,19.024 215.256,20.241 216.028,22.098 C216.478,23.251 216.671,24.534 216.671,27.031 L216.671,35.744 C216.671,41.19 216.414,41.701 213.198,41.895 C212.941,41.957 212.556,41.957 212.104,42.021 L212.104,45.033 L215.642,44.969 C218.342,44.904 219.886,44.904 220.336,44.904 C221.044,44.904 222.586,44.904 224.901,44.969 L228.374,45.033 L228.374,42.021 C227.923,41.957 227.537,41.957 227.345,41.895 C224.258,41.701 224.002,41.19 224.002,35.744 Z M128.862,27.608 L124.717,26.199 C120.256,24.661 118.937,23.7 118.937,21.779 C118.937,19.343 121.199,17.87 124.905,17.87 C128.422,17.87 130.748,18.895 131.438,20.817 C131.752,21.779 131.815,22.227 131.94,24.149 L135.522,24.149 L135.458,22.547 L135.458,19.727 C135.458,18.446 135.458,17.678 135.522,15.564 C131.312,14.54 128.171,14.155 124.591,14.155 C116.362,14.155 111.838,17.421 111.838,23.379 C111.838,27.545 114.226,30.106 120.445,32.285 L124.968,33.887 C128.36,35.104 129.365,36 129.365,37.859 C129.365,40.42 126.915,42.086 123.272,42.086 C119.628,42.086 116.739,40.678 116.047,38.627 C115.86,38.115 115.796,37.346 115.734,36.449 C115.67,36.065 115.67,35.68 115.67,35.166 L111.964,35.166 C112.028,37.217 112.09,38.051 112.09,39.459 C112.09,40.42 112.09,41.445 112.028,42.535 L111.964,43.816 C114.98,44.842 116.173,45.16 118.937,45.545 C120.696,45.738 122.456,45.865 124.151,45.865 C132.067,45.865 136.589,42.406 136.589,36.32 C136.589,31.836 134.58,29.53 128.862,27.608 Z M88.322,27.479 C88.7,23.893 89.328,22.163 90.898,20.561 C92.28,19.086 94.039,18.319 96.174,18.319 C100.76,18.319 103.21,21.458 103.335,27.479 L88.322,27.479 Z M95.923,14.155 C86.249,14.155 80.469,20.176 80.469,30.17 C80.469,39.973 86.438,45.865 96.237,45.865 C100.823,45.865 103.963,44.842 106.54,42.471 C108.487,40.613 109.24,39.396 110.182,36.065 L104.78,36.065 C103.084,39.844 100.823,41.318 96.992,41.318 C93.285,41.318 90.332,39.524 89.013,36.512 C88.448,35.166 88.259,34.207 88.197,31.772 L110.749,31.772 C110.811,30.554 110.811,29.722 110.811,29.145 C110.811,19.665 105.345,14.155 95.923,14.155 Z M80.07,14.989 C77.808,14.411 76.866,14.284 75.17,14.284 C72.909,14.284 71.024,14.795 69.328,15.819 C68.134,16.588 67.444,17.166 65.81,19.024 L65.81,15.18 L61.413,15.18 C60.032,15.18 58.837,15.244 56.136,15.115 L54.628,15.051 L54.628,18.063 C55.194,18.127 55.634,18.127 55.885,18.19 C57.706,18.382 58.46,18.511 58.9,19.024 C59.214,19.409 59.34,19.92 59.403,20.497 L59.403,36.193 C59.403,39.396 59.277,40.42 58.837,40.996 C58.46,41.574 57.456,41.83 55.634,41.957 L54.628,42.021 L54.628,45.033 L58.209,44.969 C60.66,44.904 62.23,44.904 63.046,44.904 C63.863,44.904 65.622,44.904 68.26,44.969 L72.217,45.033 L72.217,42.021 L71.024,41.957 C68.826,41.83 67.695,41.51 67.255,40.996 C66.689,40.357 66.564,39.396 66.564,36.193 L66.564,29.786 C66.564,24.853 67.255,22.291 69.014,20.625 C70.145,19.6 71.589,18.96 73.034,18.96 C74.73,18.96 75.673,19.792 75.987,21.522 C76.112,22.419 76.175,22.739 76.301,24.725 L80.07,24.725 L80.006,23.059 L80.006,19.792 C80.006,18.127 80.006,17.229 80.07,14.989 L80.07,14.989 Z");
    			attr_dev(path0, "id", "Fill-resume-logo-1");
    			attr_dev(path0, "fill", "#000000");
    			add_location(path0, file$1, 28, 24, 965);
    			attr_dev(path1, "d", "M303.51,41.637 C298.736,41.637 296.035,37.537 296.035,30.17 C296.035,22.868 298.736,18.767 303.51,18.767 C308.347,18.767 311.048,22.868 311.048,30.17 C311.048,37.537 308.347,41.637 303.51,41.637 Z M303.51,14.155 C294.213,14.155 288.37,20.305 288.37,30.042 C288.37,39.779 294.213,45.865 303.51,45.865 C312.869,45.865 318.711,39.779 318.711,30.042 C318.711,20.241 312.869,14.155 303.51,14.155 Z M372.132,41.895 C369.045,41.701 368.787,41.19 368.787,35.744 L368.787,26.326 C368.787,20.689 367.888,18.19 365.122,16.268 C363.13,14.859 360.687,14.155 357.729,14.155 C355.092,14.155 352.777,14.731 350.977,15.948 C349.627,16.846 348.983,17.421 347.119,19.471 C346.024,17.678 345.512,16.973 344.354,16.141 C342.616,14.859 340.174,14.155 337.409,14.155 C332.973,14.155 330.207,15.5 327.122,19.28 L327.122,15.18 L322.685,15.18 C321.334,15.18 320.049,15.244 317.477,15.115 L316.182,15.051 L316.31,18.063 C316.89,18.127 317.155,18.19 317.477,18.19 C319.084,18.319 319.855,18.638 320.24,19.409 C320.627,20.176 320.691,20.432 320.691,23.379 L320.691,35.744 C320.691,38.818 320.563,39.973 320.177,40.678 C319.728,41.445 319.066,41.766 317.266,41.895 C317.105,41.934 317.236,41.951 316.977,41.971 L316.977,45.024 L316.998,45.024 L316.999,45.033 L316.999,45.018 L319.534,44.969 C321.977,44.904 323.521,44.904 324.292,44.904 C325.063,44.904 326.671,44.904 329.05,44.969 L332.587,45.033 L332.587,42.021 C332.072,41.957 331.751,41.957 331.494,41.895 C328.278,41.701 328.021,41.125 328.021,35.744 L328.021,27.928 C328.021,23.763 328.729,21.779 330.786,20.305 C331.943,19.471 333.423,19.024 334.966,19.024 C337.409,19.024 339.66,20.241 340.367,22.098 C340.817,23.188 341.011,24.853 341.011,27.223 L341.011,35.744 C341.011,41.19 340.688,41.701 337.475,41.895 C337.217,41.957 336.895,41.957 336.381,42.021 L336.381,45.033 L339.981,44.969 C342.359,44.904 343.903,44.904 344.611,44.904 C345.318,44.904 346.926,44.904 349.305,44.969 L352.906,45.033 L352.906,42.021 C352.392,41.957 352.07,41.957 351.813,41.895 C348.598,41.701 348.276,41.19 348.276,35.744 L348.276,27.992 C348.276,23.829 349.112,21.779 351.362,20.241 C352.584,19.471 353.999,19.024 355.542,19.024 C358.05,19.024 360.042,20.241 360.814,22.098 C361.265,23.251 361.457,24.534 361.457,27.031 L361.457,35.744 C361.457,41.19 361.2,41.701 357.985,41.895 C357.729,41.957 357.342,41.957 356.893,42.021 L356.893,45.033 L360.429,44.969 C363.13,44.904 364.672,44.904 365.122,44.904 C365.83,44.904 367.373,44.904 369.688,44.969 L373.16,45.033 L373.16,42.021 C372.711,41.957 372.324,41.957 372.132,41.895 Z M276.852,41.318 C271.826,41.318 268.938,37.154 268.938,29.915 C268.938,22.227 271.826,18.254 277.418,18.254 C280.684,18.254 282.316,19.215 282.757,21.393 C282.945,22.483 282.945,22.803 283.134,25.301 L287.153,25.301 L287.091,23.508 C287.028,22.354 287.028,21.202 287.028,20.113 C287.028,18.446 287.091,17.614 287.153,15.628 C282.819,14.54 280.244,14.155 277.04,14.155 C267.114,14.155 261.273,20.047 261.273,30.042 C261.273,31.147 261.359,32.199 261.508,33.209 C265.256,33.429 268.226,36.449 268.226,40.152 C268.226,41.315 267.929,42.409 267.411,43.372 C269.762,44.985 272.705,45.865 276.099,45.865 C282.819,45.865 286.651,42.471 287.782,35.488 L283.008,35.488 C281.94,39.717 280.244,41.318 276.852,41.318 L276.852,41.318 Z");
    			attr_dev(path1, "id", "Fill-resume-logo-2");
    			attr_dev(path1, "fill", "#000000");
    			add_location(path1, file$1, 33, 24, 7563);
    			xlink_attr(use, "xlink:href", "#path-1");
    			add_location(use, file$1, 40, 32, 11140);
    			attr_dev(mask, "id", "resume-logo-mask-2");
    			attr_dev(mask, "fill", "white");
    			add_location(mask, file$1, 39, 28, 11064);
    			attr_dev(g0, "id", "Clip-4");
    			add_location(g0, file$1, 42, 28, 11233);
    			attr_dev(path2, "d", "M261.072,35.147 C258.232,35.147 255.934,37.387 255.934,40.15 C255.934,42.912 258.232,45.152 261.072,45.152 C263.91,45.152 266.21,42.912 266.21,40.15 C266.21,37.387 263.91,35.147 261.072,35.147");
    			attr_dev(path2, "id", "Fill-resume-logo-3");
    			attr_dev(path2, "fill", "#000000");
    			attr_dev(path2, "mask", "url(#resume-logo-mask-2)");
    			add_location(path2, file$1, 43, 28, 11279);
    			attr_dev(path3, "d", "M23.052,41.721 C21.643,36.986 19.72,32.678 17.337,28.917 C13.281,22.514 9.242,19.881 9.201,19.856 C9.068,19.77 8.996,19.616 9.017,19.458 C9.038,19.301 9.147,19.17 9.298,19.122 C15.671,17.096 23.357,12.54 28.682,9.074 C30.562,7.851 32.218,6.62 33.692,5.586 C32.401,3.223 31.367,2.03 29.075,0.459 C28.687,0.194 27.402,1.971 17.468,7.772 C7.802,13.415 0.024,16.295 0.003,16.438 C-0.016,16.582 0.048,16.723 0.17,16.802 C0.182,16.811 1.544,17.623 3.385,19.226 C5.084,20.706 7.658,23.178 10.271,26.567 C13.206,30.372 15.594,34.531 17.368,38.93 C19.584,44.428 21.226,51.082 21.493,57.199 C21.499,57.326 21.567,57.44 21.674,57.504 C21.733,57.539 21.799,57.557 21.866,57.557 C21.921,57.557 21.977,57.545 22.028,57.52 C22.057,57.506 23.471,56.826 25.623,55.775 C25.204,50.769 24.344,46.061 23.052,41.721");
    			attr_dev(path3, "id", "Fill-resume-logo-5");
    			attr_dev(path3, "fill", "#000000");
    			attr_dev(path3, "mask", "url(#resume-logo-mask-2)");
    			add_location(path3, file$1, 49, 28, 11740);
    			attr_dev(path4, "d", "M49.035,41.93 C49.261,39.48 49.461,35.639 49.131,31.246 C48.754,26.242 47.788,21.528 46.258,17.237 C44.517,12.352 42.037,8.004 38.876,4.29 C37.214,5.525 33.831,7.983 29.715,10.661 C24.977,13.744 18.393,17.678 12.42,20.018 C12.627,20.206 12.846,20.409 13.075,20.629 C15.2,22.669 17.171,25.117 18.937,27.903 C21.414,31.813 23.409,36.279 24.867,41.18 C26.484,46.611 27.443,52.596 27.725,59 C29.361,58.164 31.822,56.875 34.54,55.33 C38.853,52.881 44.717,49.277 48.533,45.836 C48.649,45.166 48.863,43.799 49.035,41.93");
    			attr_dev(path4, "id", "Fill-resume-logo-6");
    			attr_dev(path4, "fill", "#000000");
    			attr_dev(path4, "mask", "url(#resume-logo-mask-2)");
    			add_location(path4, file$1, 55, 28, 12802);
    			attr_dev(g1, "id", "Group-7");
    			attr_dev(g1, "stroke-width", "1");
    			add_location(g1, file$1, 38, 24, 11002);
    			attr_dev(g2, "id", "resume-logo");
    			add_location(g2, file$1, 27, 20, 920);
    			attr_dev(g3, "id", "resume_white_grey_com");
    			add_location(g3, file$1, 26, 16, 869);
    			attr_dev(g4, "id", "Page-1");
    			attr_dev(g4, "stroke", "none");
    			attr_dev(g4, "stroke-width", "1");
    			attr_dev(g4, "fill", "none");
    			attr_dev(g4, "fill-rule", "evenodd");
    			add_location(g4, file$1, 19, 12, 681);
    			attr_dev(svg, "class", "navbar-brand styles-module--header-brand-short--2y210");
    			attr_dev(svg, "alt", "Resume.com");
    			attr_dev(svg, "width", "374px");
    			attr_dev(svg, "height", "59px");
    			attr_dev(svg, "viewBox", "0 0 374 59");
    			attr_dev(svg, "version", "1.1");
    			add_location(svg, file$1, 5, 8, 248);
    			attr_dev(div0, "class", "col-span-1 flex justify-center py-8 px-8");
    			add_location(div0, file$1, 4, 4, 185);
    			attr_dev(img0, "class", "max-h-12");
    			if (img0.src !== (img0_src_value = "https://tailwindui.com/img/logos/mirage-logo-gray-400.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Mirage");
    			add_location(img0, file$1, 68, 8, 13751);
    			attr_dev(div1, "class", "col-span-1 flex justify-center py-8 px-8 bg-gray-50");
    			add_location(div1, file$1, 67, 4, 13677);
    			attr_dev(img1, "class", "max-h-12");
    			if (img1.src !== (img1_src_value = "https://tailwindui.com/img/logos/tuple-logo-gray-400.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Tuple");
    			add_location(img1, file$1, 75, 8, 13986);
    			attr_dev(div2, "class", "col-span-1 flex justify-center py-8 px-8 bg-gray-50");
    			add_location(div2, file$1, 74, 4, 13912);
    			attr_dev(img2, "class", "max-h-12");
    			if (img2.src !== (img2_src_value = "https://tailwindui.com/img/logos/laravel-logo-gray-400.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Laravel");
    			add_location(img2, file$1, 82, 8, 14219);
    			attr_dev(div3, "class", "col-span-1 flex justify-center py-8 px-8 bg-gray-50");
    			add_location(div3, file$1, 81, 4, 14145);
    			attr_dev(img3, "class", "max-h-12");
    			if (img3.src !== (img3_src_value = "https://tailwindui.com/img/logos/statickit-logo-gray-400.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "StaticKit");
    			add_location(img3, file$1, 89, 8, 14456);
    			attr_dev(div4, "class", "col-span-1 flex justify-center py-8 px-8 bg-gray-50");
    			add_location(div4, file$1, 88, 4, 14382);
    			attr_dev(img4, "class", "max-h-12");
    			if (img4.src !== (img4_src_value = "https://tailwindui.com/img/logos/statamic-logo-gray-400.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Statamic");
    			add_location(img4, file$1, 96, 8, 14697);
    			attr_dev(div5, "class", "col-span-1 flex justify-center py-8 px-8 bg-gray-50");
    			add_location(div5, file$1, 95, 4, 14623);
    			attr_dev(div6, "class", "mt-6 grid grid-cols-2 gap-0.5 md:grid-cols-3 lg:mt-8");
    			add_location(div6, file$1, 3, 0, 114);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, svg);
    			append_dev(svg, defs);
    			append_dev(defs, polygon);
    			append_dev(svg, g4);
    			append_dev(g4, g3);
    			append_dev(g3, g2);
    			append_dev(g2, path0);
    			append_dev(g2, path1);
    			append_dev(g2, g1);
    			append_dev(g1, mask);
    			append_dev(mask, use);
    			append_dev(g1, g0);
    			append_dev(g1, path2);
    			append_dev(g1, path3);
    			append_dev(g1, path4);
    			append_dev(div6, t2);
    			append_dev(div6, div1);
    			append_dev(div1, img0);
    			append_dev(div6, t3);
    			append_dev(div6, div2);
    			append_dev(div2, img1);
    			append_dev(div6, t4);
    			append_dev(div6, div3);
    			append_dev(div3, img2);
    			append_dev(div6, t5);
    			append_dev(div6, div4);
    			append_dev(div4, img3);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, img4);
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
    			attr_dev(p0, "class", "text-2xl font-semibold tracking-wide");
    			add_location(p0, file, 19, 6, 654);
    			attr_dev(div1, "class", "block");
    			add_location(div1, file, 18, 5, 628);
    			attr_dev(h1, "class", "font-sans mt-1 text-3xl font-bold sm:text-5xl sm:tracking-tight lg:text-6xl");
    			add_location(h1, file, 24, 6, 772);
    			attr_dev(div2, "class", "block");
    			add_location(div2, file, 23, 5, 746);
    			attr_dev(p1, "class", "text-xl");
    			add_location(p1, file, 31, 6, 947);
    			attr_dev(div3, "class", "block");
    			add_location(div3, file, 30, 5, 921);
    			attr_dev(p2, "class", "text-base");
    			add_location(p2, file, 37, 6, 1097);
    			attr_dev(div4, "class", "block");
    			add_location(div4, file, 36, 5, 1071);
    			attr_dev(div5, "class", "block");
    			add_location(div5, file, 46, 5, 1481);
    			attr_dev(div6, "class", "block");
    			add_location(div6, file, 49, 5, 1538);
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
    			add_location(meta, file, 60, 1, 1683);
    			attr_dev(html, "lang", "en");
    			add_location(html, file, 65, 1, 1809);
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
