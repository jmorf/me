
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
    	let section;
    	let p0;
    	let small0;
    	let t1;
    	let p1;
    	let small1;
    	let t2;
    	let a0;
    	let t4;
    	let a1;
    	let t6;
    	let a2;
    	let t8;
    	let t9;
    	let p2;
    	let small2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			p0 = element("p");
    			small0 = element("small");
    			small0.textContent = "© None. Do what you like with this page ✌🏼.";
    			t1 = space();
    			p1 = element("p");
    			small1 = element("small");
    			t2 = text("Built with ");
    			a0 = element("a");
    			a0.textContent = "Pico";
    			t4 = text(",\n            ");
    			a1 = element("a");
    			a1.textContent = "Svelte";
    			t6 = text(", &\n            ");
    			a2 = element("a");
    			a2.textContent = "Cloudflare Pages";
    			t8 = text(" ❤️.");
    			t9 = space();
    			p2 = element("p");
    			small2 = element("small");
    			small2.textContent = "I chose Svelte because every other JS framework I tried made me 🤮.";
    			add_location(small0, file$2, 2, 8, 26);
    			add_location(p0, file$2, 1, 4, 14);
    			attr_dev(a0, "href", "https://picocss.com/");
    			attr_dev(a0, "class", "contrast");
    			add_location(a0, file$2, 6, 23, 147);
    			attr_dev(a1, "href", "https://svelte.dev/");
    			attr_dev(a1, "class", "contrast");
    			add_location(a1, file$2, 7, 12, 217);
    			attr_dev(a2, "href", "https://pages.cloudflare.com/");
    			attr_dev(a2, "class", "contrast");
    			add_location(a2, file$2, 8, 12, 290);
    			add_location(small1, file$2, 5, 8, 116);
    			add_location(p1, file$2, 4, 4, 104);
    			add_location(small2, file$2, 14, 8, 444);
    			add_location(p2, file$2, 13, 4, 432);
    			add_location(section, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, p0);
    			append_dev(p0, small0);
    			append_dev(section, t1);
    			append_dev(section, p1);
    			append_dev(p1, small1);
    			append_dev(small1, t2);
    			append_dev(small1, a0);
    			append_dev(small1, t4);
    			append_dev(small1, a1);
    			append_dev(small1, t6);
    			append_dev(small1, a2);
    			append_dev(small1, t8);
    			append_dev(section, t9);
    			append_dev(section, p2);
    			append_dev(p2, small2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
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
    	let section;
    	let h4;
    	let t1;
    	let div3;
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
    	let div7;
    	let div4;
    	let img3;
    	let img3_src_value;
    	let t5;
    	let div5;
    	let img4;
    	let img4_src_value;
    	let t6;
    	let div6;
    	let img5;
    	let img5_src_value;
    	let t7;
    	let div11;
    	let div8;
    	let img6;
    	let img6_src_value;
    	let t8;
    	let div9;
    	let t9;
    	let div10;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h4 = element("h4");
    			h4.textContent = "A few companies I've been involved in:";
    			t1 = space();
    			div3 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t2 = space();
    			div1 = element("div");
    			img1 = element("img");
    			t3 = space();
    			div2 = element("div");
    			img2 = element("img");
    			t4 = space();
    			div7 = element("div");
    			div4 = element("div");
    			img3 = element("img");
    			t5 = space();
    			div5 = element("div");
    			img4 = element("img");
    			t6 = space();
    			div6 = element("div");
    			img5 = element("img");
    			t7 = space();
    			div11 = element("div");
    			div8 = element("div");
    			img6 = element("img");
    			t8 = space();
    			div9 = element("div");
    			t9 = space();
    			div10 = element("div");
    			add_location(h4, file$1, 1, 4, 14);
    			attr_dev(img0, "class", "company");
    			if (img0.src !== (img0_src_value = "img/cheakamus.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Cheakamus");
    			attr_dev(img0, "loading", "lazy");
    			add_location(img0, file$1, 4, 12, 126);
    			attr_dev(div0, "class", "center");
    			add_location(div0, file$1, 3, 8, 93);
    			attr_dev(img1, "class", "company");
    			if (img1.src !== (img1_src_value = "img/strong.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Strong Investments");
    			add_location(img1, file$1, 12, 12, 337);
    			attr_dev(div1, "class", "center");
    			add_location(div1, file$1, 11, 8, 304);
    			attr_dev(img2, "class", "company");
    			if (img2.src !== (img2_src_value = "img/titan.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Titan Research");
    			attr_dev(img2, "loading", "lazy");
    			add_location(img2, file$1, 19, 12, 523);
    			attr_dev(div2, "class", "center");
    			add_location(div2, file$1, 18, 8, 490);
    			attr_dev(div3, "class", "grid");
    			add_location(div3, file$1, 2, 4, 66);
    			attr_dev(img3, "class", "company");
    			if (img3.src !== (img3_src_value = "img/logo.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "Logo.com");
    			attr_dev(img3, "loading", "lazy");
    			add_location(img3, file$1, 29, 12, 769);
    			attr_dev(div4, "class", "center");
    			add_location(div4, file$1, 28, 8, 736);
    			attr_dev(img4, "class", "company");
    			if (img4.src !== (img4_src_value = "img/ocean.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "Ocean Networks");
    			attr_dev(img4, "loading", "lazy");
    			add_location(img4, file$1, 37, 12, 974);
    			attr_dev(div5, "class", "center");
    			add_location(div5, file$1, 36, 8, 941);
    			attr_dev(img5, "class", "company");
    			if (img5.src !== (img5_src_value = "img/resume.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "Resume.com");
    			attr_dev(img5, "loading", "lazy");
    			add_location(img5, file$1, 45, 12, 1186);
    			attr_dev(div6, "class", "center");
    			add_location(div6, file$1, 44, 8, 1153);
    			attr_dev(div7, "class", "grid");
    			add_location(div7, file$1, 27, 4, 709);
    			attr_dev(img6, "class", "company");
    			if (img6.src !== (img6_src_value = "img/namescon.png")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "NamesCon");
    			attr_dev(img6, "loading", "lazy");
    			add_location(img6, file$1, 55, 12, 1429);
    			attr_dev(div8, "class", "center");
    			add_location(div8, file$1, 54, 8, 1396);
    			add_location(div9, file$1, 62, 8, 1605);
    			add_location(div10, file$1, 63, 8, 1621);
    			attr_dev(div11, "class", "grid");
    			add_location(div11, file$1, 53, 4, 1369);
    			add_location(section, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h4);
    			append_dev(section, t1);
    			append_dev(section, div3);
    			append_dev(div3, div0);
    			append_dev(div0, img0);
    			append_dev(div3, t2);
    			append_dev(div3, div1);
    			append_dev(div1, img1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, img2);
    			append_dev(section, t4);
    			append_dev(section, div7);
    			append_dev(div7, div4);
    			append_dev(div4, img3);
    			append_dev(div7, t5);
    			append_dev(div7, div5);
    			append_dev(div5, img4);
    			append_dev(div7, t6);
    			append_dev(div7, div6);
    			append_dev(div6, img5);
    			append_dev(section, t7);
    			append_dev(section, div11);
    			append_dev(div11, div8);
    			append_dev(div8, img6);
    			append_dev(div11, t8);
    			append_dev(div11, div9);
    			append_dev(div11, t9);
    			append_dev(div11, div10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
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
    	let meta0;
    	let meta1;
    	let link0;
    	let title_value;
    	let meta2;
    	let meta3;
    	let link1;
    	let meta4;
    	let meta5;
    	let meta6;
    	let meta7;
    	let meta8;
    	let meta9;
    	let meta10;
    	let meta11;
    	let meta12;
    	let meta13;
    	let meta14;
    	let t0;
    	let main;
    	let section;
    	let div2;
    	let div0;
    	let hgroup;
    	let h1;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let a0;
    	let svg0;
    	let path0;
    	let t5;
    	let a1;
    	let svg1;
    	let path1;
    	let t6;
    	let a2;
    	let svg2;
    	let path2;
    	let t7;
    	let p2;
    	let t9;
    	let div1;
    	let img;
    	let img_src_value;
    	let t10;
    	let companies;
    	let t11;
    	let footer;
    	let current;
    	document.title = title_value = /*title*/ ctx[1];
    	companies = new Companies({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			meta0 = element("meta");
    			meta1 = element("meta");
    			link0 = element("link");
    			meta2 = element("meta");
    			meta3 = element("meta");
    			link1 = element("link");
    			meta4 = element("meta");
    			meta5 = element("meta");
    			meta6 = element("meta");
    			meta7 = element("meta");
    			meta8 = element("meta");
    			meta9 = element("meta");
    			meta10 = element("meta");
    			meta11 = element("meta");
    			meta12 = element("meta");
    			meta13 = element("meta");
    			meta14 = element("meta");
    			t0 = space();
    			main = element("main");
    			section = element("section");
    			div2 = element("div");
    			div0 = element("div");
    			hgroup = element("hgroup");
    			h1 = element("h1");
    			h1.textContent = "👋🏼 I'm James";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "I like building stuff. Sometimes it works. Mostly it\n\t\t\t\t\t\tdoesn't.";
    			t4 = space();
    			p1 = element("p");
    			a0 = element("a");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t5 = space();
    			a1 = element("a");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t6 = space();
    			a2 = element("a");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "I'm a developer of questionable skill, sometime\n\t\t\t\t\tentrepreneur, and reluctant angel investor. I somehow\n\t\t\t\t\ttripped and helped build companies in verticals like Cyber\n\t\t\t\t\tSecurity, HR, Real Estate, and Domain Names. I've also\n\t\t\t\t\tinvested in a bunch of start-ups built by people much\n\t\t\t\t\tsmarter than me. I like building new things, hacking on side\n\t\t\t\t\tprojects, learning from other peoples mistakes and teaching\n\t\t\t\t\tfrom my own.";
    			t9 = space();
    			div1 = element("div");
    			img = element("img");
    			t10 = space();
    			create_component(companies.$$.fragment);
    			t11 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(meta0, "itemprop", "name");
    			attr_dev(meta0, "content", /*title*/ ctx[1]);
    			add_location(meta0, file, 9, 1, 201);
    			attr_dev(meta1, "itemprop", "image");
    			attr_dev(meta1, "content", "img/james_slide.jpg");
    			add_location(meta1, file, 10, 1, 243);
    			attr_dev(link0, "rel", "canonical");
    			attr_dev(link0, "href", "https://jamesmorfopoulos.com/");
    			add_location(link0, file, 11, 1, 300);
    			attr_dev(meta2, "name", "title");
    			attr_dev(meta2, "content", /*title*/ ctx[1]);
    			add_location(meta2, file, 15, 1, 416);
    			attr_dev(meta3, "name", "description");
    			attr_dev(meta3, "content", /*description*/ ctx[0]);
    			add_location(meta3, file, 16, 1, 455);
    			attr_dev(link1, "rel", "icon");
    			attr_dev(link1, "type", "image/png");
    			attr_dev(link1, "href", "/favicon.png");
    			add_location(link1, file, 17, 1, 506);
    			attr_dev(meta4, "property", "og:type");
    			attr_dev(meta4, "content", "website");
    			add_location(meta4, file, 20, 1, 597);
    			attr_dev(meta5, "property", "og:site_name");
    			attr_dev(meta5, "content", /*title*/ ctx[1]);
    			add_location(meta5, file, 21, 1, 644);
    			attr_dev(meta6, "property", "og:locale");
    			attr_dev(meta6, "content", "en_US");
    			add_location(meta6, file, 22, 1, 694);
    			attr_dev(meta7, "property", "og:url");
    			attr_dev(meta7, "content", "https://jamesmorfopoulos.com");
    			add_location(meta7, file, 23, 1, 741);
    			attr_dev(meta8, "property", "og:title");
    			attr_dev(meta8, "content", /*title*/ ctx[1]);
    			add_location(meta8, file, 24, 1, 808);
    			attr_dev(meta9, "property", "og:description");
    			attr_dev(meta9, "content", /*description*/ ctx[0]);
    			add_location(meta9, file, 25, 1, 854);
    			attr_dev(meta10, "property", "og:image");
    			attr_dev(meta10, "content", "img/james_slide.jpg");
    			add_location(meta10, file, 26, 1, 912);
    			attr_dev(meta11, "property", "twitter:card");
    			attr_dev(meta11, "content", "summary_large_image");
    			add_location(meta11, file, 29, 1, 991);
    			attr_dev(meta12, "property", "twitter:url");
    			attr_dev(meta12, "content", "https://jamesmorfopoulos.com");
    			add_location(meta12, file, 30, 1, 1055);
    			attr_dev(meta13, "property", "twitter:title");
    			attr_dev(meta13, "content", /*title*/ ctx[1]);
    			add_location(meta13, file, 31, 1, 1127);
    			attr_dev(meta14, "property", "twitter:image");
    			attr_dev(meta14, "content", "img/james_slide.jpg");
    			add_location(meta14, file, 32, 1, 1178);
    			add_location(h1, file, 40, 5, 1342);
    			add_location(p0, file, 41, 5, 1371);
    			add_location(hgroup, file, 39, 4, 1328);
    			attr_dev(path0, "d", "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84");
    			add_location(path0, file, 53, 7, 1642);
    			attr_dev(svg0, "class", "socials");
    			attr_dev(svg0, "viewBox", "0 0 24 24");
    			attr_dev(svg0, "aria-hidden", "true");
    			add_location(svg0, file, 48, 6, 1546);
    			attr_dev(a0, "href", "https://twitter.com/jmorf");
    			attr_dev(a0, "class", "contrast");
    			add_location(a0, file, 47, 5, 1486);
    			attr_dev(path1, "fill-rule", "evenodd");
    			attr_dev(path1, "d", "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z");
    			attr_dev(path1, "clip-rule", "evenodd");
    			add_location(path1, file, 64, 7, 2277);
    			attr_dev(svg1, "class", "socials");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			attr_dev(svg1, "aria-hidden", "true");
    			add_location(svg1, file, 59, 6, 2181);
    			attr_dev(a1, "href", "https://github.com/jmorf");
    			attr_dev(a1, "class", "contrast");
    			add_location(a1, file, 58, 5, 2122);
    			attr_dev(path2, "fill-rule", "evenodd");
    			attr_dev(path2, "d", "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z");
    			attr_dev(path2, "clip-rule", "evenodd");
    			add_location(path2, file, 80, 7, 3299);
    			attr_dev(svg2, "class", "socials");
    			attr_dev(svg2, "viewBox", "0 0 24 24");
    			attr_dev(svg2, "aria-hidden", "true");
    			add_location(svg2, file, 75, 6, 3203);
    			attr_dev(a2, "href", "https://www.linkedin.com/in/morfopoulos/");
    			attr_dev(a2, "class", "contrast");
    			add_location(a2, file, 71, 5, 3110);
    			add_location(p1, file, 46, 4, 1477);
    			add_location(p2, file, 88, 4, 3918);
    			add_location(div0, file, 38, 3, 1318);
    			attr_dev(img, "class", "profile");
    			if (img.src !== (img_src_value = "img/james_slide_sm.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "James Morfopoulos");
    			add_location(img, file, 100, 4, 4413);
    			attr_dev(div1, "class", "center");
    			add_location(div1, file, 99, 3, 4388);
    			attr_dev(div2, "class", "grid");
    			add_location(div2, file, 37, 2, 1296);
    			add_location(section, file, 36, 1, 1284);
    			attr_dev(main, "class", "container");
    			add_location(main, file, 35, 0, 1258);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, meta0);
    			append_dev(document.head, meta1);
    			append_dev(document.head, link0);
    			append_dev(document.head, meta2);
    			append_dev(document.head, meta3);
    			append_dev(document.head, link1);
    			append_dev(document.head, meta4);
    			append_dev(document.head, meta5);
    			append_dev(document.head, meta6);
    			append_dev(document.head, meta7);
    			append_dev(document.head, meta8);
    			append_dev(document.head, meta9);
    			append_dev(document.head, meta10);
    			append_dev(document.head, meta11);
    			append_dev(document.head, meta12);
    			append_dev(document.head, meta13);
    			append_dev(document.head, meta14);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, section);
    			append_dev(section, div2);
    			append_dev(div2, div0);
    			append_dev(div0, hgroup);
    			append_dev(hgroup, h1);
    			append_dev(hgroup, t2);
    			append_dev(hgroup, p0);
    			append_dev(div0, t4);
    			append_dev(div0, p1);
    			append_dev(p1, a0);
    			append_dev(a0, svg0);
    			append_dev(svg0, path0);
    			append_dev(p1, t5);
    			append_dev(p1, a1);
    			append_dev(a1, svg1);
    			append_dev(svg1, path1);
    			append_dev(p1, t6);
    			append_dev(p1, a2);
    			append_dev(a2, svg2);
    			append_dev(svg2, path2);
    			append_dev(div0, t7);
    			append_dev(div0, p2);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			append_dev(main, t10);
    			mount_component(companies, main, null);
    			append_dev(main, t11);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 2) {
    				attr_dev(meta0, "content", /*title*/ ctx[1]);
    			}

    			if ((!current || dirty & /*title*/ 2) && title_value !== (title_value = /*title*/ ctx[1])) {
    				document.title = title_value;
    			}

    			if (!current || dirty & /*title*/ 2) {
    				attr_dev(meta2, "content", /*title*/ ctx[1]);
    			}

    			if (!current || dirty & /*description*/ 1) {
    				attr_dev(meta3, "content", /*description*/ ctx[0]);
    			}

    			if (!current || dirty & /*title*/ 2) {
    				attr_dev(meta5, "content", /*title*/ ctx[1]);
    			}

    			if (!current || dirty & /*title*/ 2) {
    				attr_dev(meta8, "content", /*title*/ ctx[1]);
    			}

    			if (!current || dirty & /*description*/ 1) {
    				attr_dev(meta9, "content", /*description*/ ctx[0]);
    			}

    			if (!current || dirty & /*title*/ 2) {
    				attr_dev(meta13, "content", /*title*/ ctx[1]);
    			}
    		},
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
    			detach_dev(meta0);
    			detach_dev(meta1);
    			detach_dev(link0);
    			detach_dev(meta2);
    			detach_dev(meta3);
    			detach_dev(link1);
    			detach_dev(meta4);
    			detach_dev(meta5);
    			detach_dev(meta6);
    			detach_dev(meta7);
    			detach_dev(meta8);
    			detach_dev(meta9);
    			detach_dev(meta10);
    			detach_dev(meta11);
    			detach_dev(meta12);
    			detach_dev(meta13);
    			detach_dev(meta14);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(companies);
    			destroy_component(footer);
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
    	let { description } = $$props;
    	let { title } = $$props;
    	const writable_props = ["description", "title"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("description" in $$props) $$invalidate(0, description = $$props.description);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    	};

    	$$self.$capture_state = () => ({ Footer, Companies, description, title });

    	$$self.$inject_state = $$props => {
    		if ("description" in $$props) $$invalidate(0, description = $$props.description);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [description, title];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { description: 0, title: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*description*/ ctx[0] === undefined && !("description" in props)) {
    			console.warn("<App> was created without expected prop 'description'");
    		}

    		if (/*title*/ ctx[1] === undefined && !("title" in props)) {
    			console.warn("<App> was created without expected prop 'title'");
    		}
    	}

    	get description() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		title: "James Morfopoulos",
    		description: ''
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
