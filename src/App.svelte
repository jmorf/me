<script>
	import Footer from "./Footer.svelte";
	import Companies from "./Companies.svelte";
	export let name;
</script>

<main class="container">
	<section>
		<img
			class="round"
			src="james_slide.jpg"
			alt="James Morfopoulos Slide"
		/>
	</section>
	<section>
		<hgroup>
			<h1>👋🏼 I'm James</h1>
			<p>I like building stuff. Sometimes it works. Mostly it doesn't.</p>
		</hgroup>
	</section>
	<section>
		<p>
			I'm a developer of questionable skill, sometime entrepreneur, and
			reluctant angel investor. I somehow tripped and helped build
			companies in verticals like Cyber Security, HR, Real Estate, and
			Domain Names. I've also invested in a bunch of start-ups built by
			people much smarter than me. I like building new things, hacking on
			side projects, learning from other peoples mistakes and teaching
			from my own.
		</p>
	</section>
	<section>
		<Companies />
	</section>
	<section>
		<Footer />
	</section>
</main>

<svelte:head>
	<title>James Morfopoulos</title>
	<meta
		name="description"
		content="James Morfopoulos. I like building stuff. Sometimes it works. Mostly it
	doesn't."
	/>
	<html lang="en" />
</svelte:head>
