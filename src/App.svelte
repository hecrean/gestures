<script lang="ts">
  import Canvas from "./Canvas.svelte";
</script>

<Canvas />

<div class="video">
  <video />
  <button class="play-btn" />
</div>

<div class="grid">
  <div class="grid-item">
    <img class="figure" src="https://dev.random42.com/GSK303/rsv.jpg" />
    <div class="content">
      <h1>Hello</h1>
      <p>It's a thing</p>
    </div>
  </div>
  <div class="grid-item">
    <img class="figure" src="https://dev.random42.com/GSK303/rsv.jpg" />
    <div class="content">
      <h1>Hello</h1>
      <p>It's a thing</p>
    </div>
  </div>
</div>

<style lang="scss">
  .video {
    position: relative;
    aspect-ratio: 16/9;
    width: 100%;
  }
  video {
    width: 100%;
    object-fit: contain;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .grid-item {
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 4px #0000001a;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .figure {
      width: 100%;
      aspect-ratio: 16/9;
    }
    .content {
      padding: 1rem;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }
  }

  .play-btn {
    font-family: Arial, Helvetica, sans-serif;
    background-color: #15717d;
    border: none;
    color: #fff;
    padding: 0.5rem 1rem;
    border-radius: 3rem;
    font-weight: 700;
    cursor: pointer;

    //mobile
    @media (min-width: 1024px) {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      padding: 1rem 2rem;
    }

    //desktop
  }
</style>
