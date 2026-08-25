/** Testimonials Block - client-side hydration. */

import {render} from "preact";
import {TestimonialsBlock} from "./component.jsx";

document.querySelectorAll('[data-block-type="testimonials"]').forEach((block) => {
  const propsData = block.dataset.props;
  if (!propsData) return;
  try {
    render(<TestimonialsBlock {...JSON.parse(propsData)} />, block);
  } catch (error) {
    console.error(`Failed to render testimonials block "${block.id}":`, error);
  }
});
