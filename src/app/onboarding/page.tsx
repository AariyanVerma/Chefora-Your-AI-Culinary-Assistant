'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [dietaryProfile, setDietaryProfile] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [kitchenTools, setKitchenTools] = useState<string[]>([]);
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);
  const [maxPrepTimeMinutes, setMaxPrepTimeMinutes] = useState<number | ''>('');
  const [persona, setPersona] = useState('');

  function toggleInList(value: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  }

  async function finishOnboarding() {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietaryProfile,
          allergies,
          skillLevel,
          kitchenTools,
          favoriteCuisines,
          maxPrepTimeMinutes: maxPrepTimeMinutes || null,
          persona,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Onboarding failed:', text);
        alert('Onboarding failed:\n' + text);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding request failed:', err);
      alert('Network / server error while saving onboarding');
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card w-full max-w-2xl mx-auto">
        <p className="text-xs text-white/50 mb-2">Step {step} of 4</p>
        <h1 className="text-2xl font-semibold mb-4 text-white">
          Tell Chefora about you
        </h1>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Dietary profile & allergies help Chefora avoid recipes that don&apos;t
              fit you.
            </p>

            <div className="flex flex-wrap gap-2">
              {['none', 'vegetarian', 'vegan', 'gluten_free', 'halal', 'kosher'].map(
                opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      dietaryProfile === opt
                        ? 'bg-cyan-500/40 border-cyan-300'
                        : 'border-white/20'
                    }`}
                    onClick={() => setDietaryProfile(opt === 'none' ? '' : opt)}
                  >
                    {opt === 'none' ? 'No preference' : opt.replace('_', ' ')}
                  </button>
                )
              )}
            </div>

            <div>
              <p className="text-sm text-white/70 mb-1">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {['nuts', 'dairy', 'shellfish', 'eggs', 'soy'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      allergies.includes(opt)
                        ? 'bg-pink-500/40 border-pink-300'
                        : 'border-white/20'
                    }`}
                    onClick={() => toggleInList(opt, allergies, setAllergies)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              How comfortable are you in the kitchen?
            </p>
            <div className="flex flex-wrap gap-2">
              {['beginner', 'intermediate', 'pro'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    skillLevel === opt
                      ? 'bg-cyan-500/40 border-cyan-300'
                      : 'border-white/20'
                  }`}
                  onClick={() => setSkillLevel(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div>
              <p className="text-sm text-white/70 mb-1">Which tools do you have?</p>
              <div className="flex flex-wrap gap-2">
                {['oven', 'air_fryer', 'blender', 'microwave', 'pressure_cooker'].map(
                  opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`px-3 py-1.5 rounded-full text-xs border ${
                        kitchenTools.includes(opt)
                          ? 'bg-purple-500/40 border-purple-300'
                          : 'border-white/20'
                      }`}
                      onClick={() =>
                        toggleInList(opt, kitchenTools, setKitchenTools)
                      }
                    >
                      {opt.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">What cuisines do you love?</p>
            <div className="flex flex-wrap gap-2">
              {['indian', 'italian', 'mexican', 'chinese', 'thai', 'american'].map(
                opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      favoriteCuisines.includes(opt)
                        ? 'bg-amber-500/40 border-amber-300'
                        : 'border-white/20'
                    }`}
                    onClick={() =>
                      toggleInList(opt, favoriteCuisines, setFavoriteCuisines)
                    }
                  >
                    {opt}
                  </button>
                )
              )}
            </div>

            <div>
              <p className="text-sm text-white/70 mb-1">
                Max prep time on weekdays (minutes)
              </p>
              <input
                type="number"
                min={10}
                className="auth-input w-40"
                value={maxPrepTimeMinutes}
                onChange={e =>
                  setMaxPrepTimeMinutes(
                    e.target.value ? Number(e.target.value) : ''
                  )
                }
              />
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              How should Chefora think about you when recommending recipes?
            </p>
            <div className="flex flex-wrap gap-2">
              {['student', 'fitness', 'family'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    persona === opt
                      ? 'bg-cyan-500/40 border-cyan-300'
                      : 'border-white/20'
                  }`}
                  onClick={() => setPersona(opt)}
                >
                  {opt === 'fitness'
                    ? 'Fitness mode'
                    : opt === 'family'
                    ? 'Family mode'
                    : 'Student mode'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* NAV BUTTONS */}
        <div className="mt-8 flex justify-between items-center">
          <button
            type="button"
            className="text-sm text-white/60 disabled:opacity-40"
            onClick={() => setStep(prev => (prev > 1 ? ((prev - 1) as Step) : prev))}
            disabled={step === 1}
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400"
              onClick={() => setStep(prev => ((prev + 1) as Step))}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400"
              onClick={finishOnboarding}
            >
              Finish &amp; go to dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
