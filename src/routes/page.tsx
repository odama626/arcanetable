import { A } from '@solidjs/router';
import { nanoid } from 'nanoid';
import { Component, createEffect, createSignal } from 'solid-js';
import { Button } from '~/components/ui/button';
import { createDeckStore } from '~/lib/deckStore';

const Page: Component = props => {
  const [deckStore, setDeckStore] = createDeckStore();
  const [selectedDeckIndex, setSelectedDeckIndex] = createSignal(0);

  createEffect(() => {
    console.log({ deckStore });
  });

  return (
    <div class='bg-gray-900 text-white font-sans'>
      <div class='mx-auto flex flex-col gap-5'>
        {/* <!-- Header Section with Background Image --> */}
        <header
          class='relative bg-cover bg-center bg-gray-800 rounded-lg'
          style="background-image: url('/hero.png');">
          <div class='absolute inset-0 bg-black opacity-50'></div>
          {/* <!-- Optional overlay for better text visibility --> */}
          <div class='relative flex items-center justify-between p-6'>
            <div class='flex items-center space-x-4'>
              <img src='/icon.svg' alt='Arcane Table Logo' class='w-12 h-12' />
              <span class='text-xl font-bold text-white'>Arcane Table</span>
            </div>
            <nav class='space-x-4'>
              {/* <a href='#' class='text-white hover:text-gray-300'>
                Begin
              </a>
              <a href='#' class='text-white hover:text-gray-300'>
                Home
              </a>
              <a href='#' class='text-white hover:text-gray-300'>
                Pricing
              </a>
              <a href='#' class='text-white hover:text-gray-300'>
                Contact Us
              </a>
              <a href='#' class='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'>
                Sign In
              </a>
              <a href='#' class='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
                Sign Up
              </a> */}
            </nav>
          </div>
          <div class='relative flex flex-col items-center justify-center py-60 text-center'>
            <h1 class='text-4xl font-bold text-white mb-6'>Welcome to Arcane Table</h1>
            <p class='text-xl text-gray-100 mb-6'>Unleash the power of your deck.</p>
            <A
              href={`/game/${nanoid()}`}
              class='bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700'>
              Start Now
            </A>
          </div>
        </header>

        {/* <!-- Insights Section --> */}
        <section class='py-16 bg-gray-900'>
          <div class='max-w-7xl mx-auto px-6 lg:px-8'>
            <h2 class='text-3xl font-bold text-white text-center mb-12'>Explore our Insights</h2>

            <div class='grid gap-8 lg:grid-cols-3'>
              {/* <!-- Insight Card 1 --> */}
              <div
                class='relative bg-gray-900 rounded-lg overflow-hidden h-64 flex items-end p-6'
                style="background-image: url('insight-deckbuilding.png'); background-size: cover; background-position: center;">
                <div class='absolute inset-0 bg-black opacity-50'></div>
                <div class='relative'>
                  <h3 class='text-2xl font-bold text-white'>Mastering Deck Building</h3>
                  <p class='text-gray-300 mt-2'>
                    Cultivate strategies for a competitive edge, from drafting to shuffling your
                    winning hand.
                  </p>
                </div>
              </div>

              {/* <!-- Insight Card 2 --> */}
              <div
                class='relative -900 rounded-lg overflow-hidden h-64 flex items-end p-6'
                style="background-image: url('insight-strategy.png'); background-size: cover; background-position: center;">
                <div class='absolute inset-0 bg-black opacity-50'></div>
                <div class='relative'>
                  <h3 class='text-2xl font-bold text-white'>Improve Your Strategies</h3>
                  <p class='text-gray-300 mt-2'>
                    Refine your tactics with expert insights and advanced game theories.
                  </p>
                </div>
              </div>

              {/* <!-- Insight Card 3 --> */}
              <div
                class='relative bg-gray-900 rounded-lg overflow-hidden h-64 flex items-end p-6'
                style="background-image: url('insight-balance.png'); background-size: cover; background-position: center;">
                <div class='absolute inset-0 bg-black opacity-50'></div>
                <div class='relative'>
                  <h3 class='text-2xl font-bold text-white'>Balance Your Deck</h3>
                  <p class='text-gray-300 mt-2'>
                    Achieve harmony in your deck, balancing power and strategy for optimal gameplay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <!-- Gameplay GIFs Section --> */}
        {/* <section class='py-16 bg-gray-900'>
          <div class='max-w-7xl mx-auto px-6 lg:px-8'>
            <h2 class='text-3xl font-bold text-white text-center mb-8'>See the Cards in Action</h2>
            <p class='text-lg text-gray-300 text-center mb-12'>
              Check out some highlights of our intuitive and immersive playtesting. These clips
              showcase the depth and excitement of our app.
            </p>

            <div class='grid gap-8 sm:grid-cols-2 lg:grid-cols-3'>
              <div class='relative'>
                <img
                  src='path-to-gameplay-gif1.gif'
                  alt='Gameplay GIF 1'
                  class='w-full h-auto rounded-lg shadow-lg'
                />
              </div>

              <div class='relative'>
                <img
                  src='path-to-gameplay-gif2.gif'
                  alt='Gameplay GIF 2'
                  class='w-full h-auto rounded-lg shadow-lg'
                />
              </div>

              <div class='relative'>
                <img
                  src='path-to-gameplay-gif3.gif'
                  alt='Gameplay GIF 3'
                  class='w-full h-auto rounded-lg shadow-lg'
                />
              </div>

              <div class='relative'>
                <img
                  src='path-to-gameplay-gif4.gif'
                  alt='Gameplay GIF 4'
                  class='w-full h-auto rounded-lg shadow-lg'
                />
              </div>

              <div class='relative'>
                <img
                  src='path-to-gameplay-gif5.gif'
                  alt='Gameplay GIF 5'
                  class='w-full h-auto rounded-lg shadow-lg'
                />
              </div>

              <div class='relative'>
                <img
                  src='path-to-gameplay-gif6.gif'
                  alt='Gameplay GIF 6'
                  class='w-full h-auto rounded-lg shadow-lg'
                />
              </div>
            </div>
          </div>
        </section> */}

        {/* <!-- Testimonials Section --> */}
        <section class='py-20 bg-gray-800'>
          <div class='max-w-4xl mx-auto text-center'>
            <h2 class='text-3xl font-bold mb-8'>Discover What Players Are Saying</h2>
            <div class='grid grid-cols-1 md:grid-cols-3 gap-8'>
              <div class='p-6 bg-gray-900 rounded-lg'>
                <p class='text-gray-400'>
                  "Arcane Table has revolutionized the way I play card games. The features are
                  incredible!"
                </p>
                <span class='block mt-4 text-gray-500'>- Player 1</span>
              </div>
              <div class='p-6 bg-gray-900 rounded-lg'>
                <p class='text-gray-400'>
                  "The customization options are endless, allowing me to craft the perfect deck
                  every time."
                </p>
                <span class='block mt-4 text-gray-500'>- Player 2</span>
              </div>
              <div class='p-6 bg-gray-900 rounded-lg'>
                <p class='text-gray-400'>
                  "Playing on Arcane Table is a truly immersive experience. I love the intuitive
                  interface!"
                </p>
                <span class='block mt-4 text-gray-500'>- Player 3</span>
              </div>
            </div>
          </div>
        </section>

        {/* <!-- Community Section --> */}
        {/* <section class='py-20 bg-gray-900'>
          <div class='text-center'>
            <h2 class='text-3xl font-bold mb-6'>Connect with Other Players</h2>
            <p class='text-gray-400 mb-12'>
              Join our community to share your strategies and connect with fellow players.
            </p>
            <a href='#' class='bg-blue-600 px-6 py-3 rounded-full hover:bg-blue-700'>
              Join the Community
            </a>
          </div>
          <div class='flex justify-center space-x-6 mt-12'>
            <img src='path-to-icon1.png' alt='Platform 1' class='w-12 h-12' />
            <img src='path-to-icon2.png' alt='Platform 2' class='w-12 h-12' />
            <img src='path-to-icon3.png' alt='Platform 3' class='w-12 h-12' />
          </div>
        </section> */}

        {/* <!-- Footer Section --> */}
        {/* <footer class='py-12 bg-gray-800 text-center'>
          <p class='text-gray-500 mb-6'>© 2024 Arcane Table. All rights reserved.</p>
          <div class='space-x-4'>
            <a href='#' class='text-gray-400 hover:text-white'>
              Privacy Policy
            </a>
            <a href='#' class='text-gray-400 hover:text-white'>
              Terms of Service
            </a>
            <a href='#' class='text-gray-400 hover:text-white'>
              Contact
            </a>
          </div>
        </footer> */}
      </div>
    </div>
  );
};

export default Page;
