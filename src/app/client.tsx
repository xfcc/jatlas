'use client';

import { createApp } from 'vue';
import LandingView from '../views/LandingView.vue';
import { useEffect, useRef } from 'react';

const Client = () => {
  const vueAppRef = useRef(null);

  useEffect(() => {
    if (vueAppRef.current) {
      const app = createApp(LandingView);
      app.mount(vueAppRef.current);
    }
  }, []);

  return <div ref={vueAppRef}></div>;
};

export default Client;
