<script>
	import Footer from "$lib/Footer.svelte";
	import "../custom.css";
</script>

<main class="container">
	<slot />
	<Footer />
</main>

<style>
	body {
		color: #fff;
	}

	.center {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	img.profile {
		border: 4px solid #fff;
		border-radius: 50%;
		height: auto;
		width: 18rem;
	}

	img.company {
		color: #fff;
		max-height: 3rem;
		max-width: 50%;
		height: auto;
		width: auto;
		margin: 2rem;
		object-fit: contain;
	}

	svg.socials {
		color: #fff;
		height: 1.5rem;
		margin-right: 1rem;
	}
</style>
