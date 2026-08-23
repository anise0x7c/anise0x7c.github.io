```html

<style>
  .card {
    position: relative;
    display: flex;
    flex-direction: row;
    overflow: hidden;

    background-color: color-mix(in srgb, var(--color-base) 75%, transparent);
    border-radius: var(--radius-3xl);
    box-shadow: var(--shadow-card);
    backdrop-filter: blur(10px) saturate(1.6);
    -webkit-backdrop-filter: blur(10px) saturate(1.6);

    transition:
      transform 0.4s var(--ease-bounce),
      box-shadow 0.4s var(--ease-spring),
      background-color 0.4s var(--ease-spring);
  }

  /* inset 阴影绘制在子内容之下,满宽图片会盖住它们;
     改由覆盖层伪元素承载,悬浮于内容之上 */
  .card::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 0 1px var(--color-overlay0);
    transition: box-shadow 0.4s var(--ease-spring);
  }

  .card:hover {
    transform:scale(1.03);
    box-shadow: var(--shadow-float);
  }

  .card:hover::after {
    box-shadow: var(--shadow-lqdglass);
  }

  .card:active {
    transform:scale(1);
  }

  .cover-box {
    contain: size;
    flex: 2;
    margin: 1.5rem;
  }

  .cover-img {
    display: block;
    object-fit: cover;
    width: 100%;
    height: 100%;
    border-radius: 2rem;
  }

  .card-inner {
    display: flex;
    flex: 3;
    flex-direction: column;
    justify-content: center;
    margin: 2.3rem 1rem 2.3rem 2.3rem;
    border-radius: inherit;
  }

  @media (max-width: 640px) {
    .card {
      flex-direction: column;
    }

    .cover-box {
      order: -1;
      aspect-ratio: 21 / 9;
      margin: 0;
      contain: none; /* 通栏顶图需正常参与高度布局 */
    }

    .cover-img {
      border-radius: 0;
    }

    .has-cover .card-inner {
      margin: 1.5rem 2.7rem 2.7rem 2.7rem;
    }
  }

  .card-meta {
    font-size: 0.8rem;
    color: var(--color-subtext0);
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: auto;
    padding-top: 1rem;
    margin-left: -0.2rem;
  }

  .card h3 {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0.5rem 0 0.4rem;
    color: var(--color-text);
    letter-spacing: -0.01em;
  }

  .card p {
    margin: 0;
    color: var(--color-subtext1);
    font-size: 0.95rem;
    line-height: 1.55;
  }

</style>
```