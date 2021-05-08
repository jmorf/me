<script>
	import Footer from "./Footer.svelte";
	import Companies from "./Companies.svelte";
	export let name;
</script>

<main>
	<div class="h-full w-full bg-gray-800 text-white font-sans text-center">
		<div class="container max-w-5xl px-4 mx-auto ">
			<div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
				<div class="space-y-8">
					<div class="block">
						<img
							class="w-64 md:w-72 lg:w-96 rounded-full ring-4 ring-white object-center mx-auto hover:opacity-25 transition-opacity duration-1000 ease-out"
							src="james_slide.jpg"
							alt="James Morfopoulos Slide"
						/>
					</div>
					<div class="block">
						<h1
							class="font-sans mt-1 text-6xl font-bold sm:text-5xl sm:tracking-tight lg:text-6xl"
						>
							👋🏼 I'm James
						</h1>
					</div>
					<div class="block">
						<p class="text-center text-xl font-bold tracking-wider">
							I like building stuff. Sometimes it works. Mostly it
							doesn't.
						</p>
					</div>
					<div class="block max-w-3xl mx-auto">
						<p class="text-base">
							I'm a developer of questionable skill, sometime
							entrepreneur, and reluctant angel investor. I
							somehow tripped and helped build companies in
							verticals like Cyber Security, HR, Real Estate, and
							Domain Names. I've also invested in a bunch of
							start-ups built by people much smarter than me. I
							like building new things, hacking on side projects,
							learning from other peoples mistakes and teaching
							from my own.
						</p>
					</div>
					<div class="block">
						<Companies />
					</div>
					<div class="block">
						<Footer />
					</div>
				</div>
			</div>
		</div>
	</div>
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

<style global lang="postcss">
	@tailwind base;
	@tailwind components;
	@tailwind utilities;
</style>
