<script>
    export let description;
    export let title;
</script>

<svelte:head>
    <!-- Google / Search Engine Tags -->
    <meta itemprop="name" content={title} />
    <meta itemprop="image" content="img/james_slide.jpg" />
    <link rel="canonical" href="https://jamesmorfopoulos.com/" />

    <!-- Primary Meta Tags -->
    <title>{title}</title>
    <meta name="title" content={title} />
    <meta name="description" content={description} />
    <link rel="icon" type="image/png" href="/favicon.png" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={title} />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="https://jamesmorfopoulos.com" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content="img/james_slide.jpg" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://jamesmorfopoulos.com" />
    <meta property="twitter:title" content={title} />
    <meta property="twitter:image" content="img/james_slide.jpg" />
</svelte:head>
