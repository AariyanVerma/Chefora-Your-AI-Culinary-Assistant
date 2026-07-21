'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updatePost, type CommunityPost } from '../actions';
import Image from 'next/image';
import { X, Plus, Upload } from 'lucide-react';

interface EditPostFormProps {
  post: CommunityPost;
}

export default function EditPostForm({ post }: EditPostFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption || '');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>(post.visibility as any);
  const [images, setImages] = useState<string[]>(post.media_urls || []);
  const [ingredients, setIngredients] = useState<string[]>(post.recipe?.ingredients || ['']);
  const [instructions, setInstructions] = useState<string[]>(post.recipe?.instructions || ['']);
  const [servings, setServings] = useState<number | ''>(post.recipe?.servings || '');
  const [prepTime, setPrepTime] = useState<number | ''>(post.recipe?.prep_time_minutes || '');
  const [cookTime, setCookTime] = useState<number | ''>(post.recipe?.cook_time_minutes || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>(post.recipe?.difficulty as any || '');
  const [cuisine, setCuisine] = useState(post.recipe?.cuisine || '');
  const [dietTags, setDietTags] = useState<string[]>(post.recipe?.diet_tags || []);
  const [tags, setTags] = useState<string[]>(post.recipe?.tags || []);
  const dietaryChipsRef = useRef<HTMLDivElement>(null);
  const tagsChipsRef = useRef<HTMLDivElement>(null);
  const categoryChipsRef = useRef<HTMLDivElement>(null);
  const baseDietOptions = [
    'Vegetarian', 'Vegan', 'Pescatarian', 'Flexitarian',
    'Gluten-Free', 'Dairy-Free', 'Lactose-Free', 'Egg-Free',
    'Nut-Free', 'Peanut-Free', 'Soy-Free', 'Sesame-Free',
    'Shellfish-Free', 'Fish-Free', 'Pork-Free', 'Beef-Free',
    'Halal', 'Kosher', 'Jain', 'Buddhist',
    'Keto', 'Paleo', 'Whole30', 'Atkins',
    'Low-Carb', 'Low-Fat', 'Low-Sodium', 'Low-Sugar',
    'High-Protein', 'High-Fiber', 'Mediterranean', 'DASH',
    'FODMAP', 'AIP', 'Carnivore', 'Raw Food',
    'Macrobiotic', 'Ayurvedic', 'Alkaline', 'Blood Type',
    'Diabetic-Friendly', 'Heart-Healthy', 'Anti-Inflammatory',
    'Celiac-Friendly', 'Histamine-Free', 'Nightshade-Free',
    'Oxalate-Free', 'Salicylate-Free', 'Sulfite-Free'
  ];
  
  const [availableDietOptions, setAvailableDietOptions] = useState<string[]>(() => {
    const existingDietTags = post.recipe?.diet_tags || [];
    const customTags = existingDietTags.filter(
      tag => !baseDietOptions.some(base => base.toLowerCase() === tag.toLowerCase())
    );
    return [...baseDietOptions, ...customTags];
  });
  const [newDietInput, setNewDietInput] = useState('');
  const [dietError, setDietError] = useState('');
  const baseTagOptions = [
    '#Quick', '#Healthy', '#ComfortFood', '#Dessert', '#Breakfast', '#Lunch', '#Dinner', 
    '#Snack', '#Appetizer', '#OnePot', '#MealPrep', '#BudgetFriendly', '#Gourmet', 
    '#KidFriendly', '#DateNight'
  ];
  
  const [availableTagOptions, setAvailableTagOptions] = useState<string[]>(() => {
    const existingTags = post.recipe?.tags || [];
    const customTags = existingTags
      .map(tag => {
        
        let normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
        
        normalizedTag = normalizedTag.replace(/\s+/g, '');
        
        if (normalizedTag.startsWith('#') && normalizedTag.length > 1 && normalizedTag[1] === ' ') {
          normalizedTag = '#' + normalizedTag.substring(2).replace(/\s+/g, '');
        }
        return normalizedTag;
      })
      .filter(tag => {
        const tagWithoutHash = tag.replace(/^#+/, '').replace(/\s+/g, '');
        return !baseTagOptions.some(base => {
          const baseWithoutHash = base.replace(/^#+/, '').toLowerCase();
          return baseWithoutHash === tagWithoutHash.toLowerCase();
        });
      });
    return [...baseTagOptions, ...customTags];
  });
  
  useEffect(() => {
    const existingTags = post.recipe?.tags || [];
    if (existingTags.length > 0) {
      const normalizedTags = existingTags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      );
      
      if (JSON.stringify(normalizedTags) !== JSON.stringify(tags)) {
        setTags(normalizedTags);
      }
    }
    
  }, []);
  const [newTagInput, setNewTagInput] = useState('#');
  const [tagError, setTagError] = useState('');
  
  const [categories, setCategories] = useState<string[]>(post.recipe?.categories || []);
  const [availableCategoryOptions, setAvailableCategoryOptions] = useState<string[]>(() => {
    const baseCategoryOptions = [
      'Main Course', 'Appetizer', 'Dessert', 'Breakfast', 'Lunch', 'Dinner',
      'Snack', 'Beverage', 'Soup', 'Salad', 'Side Dish', 'Sauce', 'Dip', 'Bread',
      'Pasta', 'Pizza', 'Seafood', 'Meat', 'Vegetarian', 'Vegan', 'Bakery'
    ];
    const existingCategories = post.recipe?.categories || [];
    const customCategories = existingCategories.filter(
      cat => !baseCategoryOptions.some(base => base.toLowerCase() === cat.toLowerCase())
    );
    return [...baseCategoryOptions, ...customCategories];
  });
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    const container = dietaryChipsRef.current;
    if (!container) return;

    const layoutPebbles = () => {
      const chips = Array.from(container.children) as HTMLElement[];
      if (chips.length === 0) return;

      chips.forEach(chip => {
        chip.style.flex = '0 0 auto';
        chip.style.width = 'auto';
        chip.style.minWidth = 'auto';
      });

      void container.offsetHeight;

      const containerWidth = container.offsetWidth;
      const gap = 8;
      const rows: HTMLElement[][] = [];
      let currentRow: HTMLElement[] = [];
      let currentRowWidth = 0;

      chips.forEach(chip => {
        const chipWidth = chip.offsetWidth;
        const neededWidth = currentRowWidth + chipWidth + (currentRow.length > 0 ? currentRow.length * gap : 0);
        
        if (neededWidth <= containerWidth || currentRow.length === 0) {
          currentRow.push(chip);
          currentRowWidth += chipWidth;
        } else {
          rows.push([...currentRow]);
          currentRow = [chip];
          currentRowWidth = chipWidth;
        }
      });
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }

      rows.forEach(row => {
        const naturalWidths = row.map(chip => chip.offsetWidth);
        const totalNaturalWidth = naturalWidths.reduce((sum, w) => sum + w, 0);
        const totalGapsWidth = (row.length - 1) * gap;
        const remainingSpace = containerWidth - totalNaturalWidth - totalGapsWidth;
        
        if (remainingSpace > 0 && row.length > 0) {
          const spacePerChip = remainingSpace / row.length;
          row.forEach((chip, index) => {
            const naturalWidth = naturalWidths[index];
            chip.style.flex = `1 1 ${naturalWidth}px`;
            chip.style.width = `${naturalWidth + spacePerChip}px`;
            chip.style.minWidth = `${naturalWidth}px`;
          });
        } else {
          
          row.forEach(chip => {
            chip.style.flex = '0 0 auto';
            chip.style.width = 'auto';
          });
        }
      });
    };

    const timeoutId = setTimeout(layoutPebbles, 0);

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(layoutPebbles, 0);
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [dietTags, availableDietOptions]);

  useEffect(() => {
    const container = tagsChipsRef.current;
    if (!container) return;

    const layoutPebbles = () => {
      const chips = Array.from(container.children) as HTMLElement[];
      if (chips.length === 0) return;

      chips.forEach(chip => {
        chip.style.flex = '0 0 auto';
        chip.style.width = 'auto';
        chip.style.minWidth = 'auto';
      });

      void container.offsetHeight;

      const containerWidth = container.offsetWidth;
      const gap = 8;
      const rows: HTMLElement[][] = [];
      let currentRow: HTMLElement[] = [];
      let currentRowWidth = 0;

      chips.forEach(chip => {
        const chipWidth = chip.offsetWidth;
        const neededWidth = currentRowWidth + chipWidth + (currentRow.length > 0 ? currentRow.length * gap : 0);
        
        if (neededWidth <= containerWidth || currentRow.length === 0) {
          currentRow.push(chip);
          currentRowWidth += chipWidth;
        } else {
          rows.push([...currentRow]);
          currentRow = [chip];
          currentRowWidth = chipWidth;
        }
      });
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }

      rows.forEach(row => {
        const naturalWidths = row.map(chip => chip.offsetWidth);
        const totalNaturalWidth = naturalWidths.reduce((sum, w) => sum + w, 0);
        const totalGapsWidth = (row.length - 1) * gap;
        const remainingSpace = containerWidth - totalNaturalWidth - totalGapsWidth;
        
        if (remainingSpace > 0 && row.length > 0) {
          const spacePerChip = remainingSpace / row.length;
          row.forEach((chip, index) => {
            const naturalWidth = naturalWidths[index];
            chip.style.flex = `1 1 ${naturalWidth}px`;
            chip.style.width = `${naturalWidth + spacePerChip}px`;
            chip.style.minWidth = `${naturalWidth}px`;
          });
        } else {
          
          row.forEach(chip => {
            chip.style.flex = '0 0 auto';
            chip.style.width = 'auto';
          });
        }
      });
    };

    const timeoutId = setTimeout(layoutPebbles, 0);

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(layoutPebbles, 0);
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [tags, availableTagOptions]);

  const handleAddDietPreference = () => {
    const trimmedInput = newDietInput.trim();
    if (!trimmedInput) {
      setDietError('Please enter a dietary preference');
      return;
    }

    const exists = availableDietOptions.some(
      diet => diet.toLowerCase() === trimmedInput.toLowerCase()
    );

    if (exists) {
      setDietError('This dietary preference already exists');
      return;
    }

    setAvailableDietOptions([...availableDietOptions, trimmedInput]);
    
    setDietTags([...dietTags, trimmedInput]);
    
    setNewDietInput('');
    setDietError('');
  };

  const handleNewDietKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDietPreference();
    }
  };

  const handleAddTag = () => {
    
    let tagValue = newTagInput.replace(/^#+/, '').trim();
    
    if (!tagValue) {
      setTagError('Please enter a tag name');
      return;
    }

    const normalizedTag = tagValue.replace(/\s+/g, '');
    if (normalizedTag !== tagValue) {
      setTagError('Tags cannot contain spaces');
      return;
    }

    const tagWithHash = `#${normalizedTag}`;

    const exists = availableTagOptions.some(
      tag => tag.replace(/^#+/, '').toLowerCase() === normalizedTag.toLowerCase()
    );

    if (exists) {
      setTagError('This tag already exists');
      return;
    }

    setAvailableTagOptions([...availableTagOptions, tagWithHash]);
    
    setTags([...tags, tagWithHash]);
    
    setNewTagInput('#');
    setTagError('');
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    if (!value.startsWith('#')) {
      value = '#' + value.replace(/^#+/g, '').trim();
    }
    
    value = value.replace(/\s+/g, '');
    
    setNewTagInput(value);
    setTagError('');
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
    
    if (e.key === ' ') {
      e.preventDefault();
    }
  };

  const handleAddCategory = () => {
    const trimmedInput = newCategoryInput.trim();
    if (!trimmedInput) {
      setCategoryError('Please enter a category name');
      return;
    }

    const exists = availableCategoryOptions.some(
      cat => cat.toLowerCase() === trimmedInput.toLowerCase()
    );

    if (exists) {
      setCategoryError('This category already exists');
      return;
    }

    setAvailableCategoryOptions([...availableCategoryOptions, trimmedInput]);
    
    setCategories([...categories, trimmedInput]);
    
    setNewCategoryInput('');
    setCategoryError('');
  };

  const handleCategoryKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/community/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setImages(prev => [...prev, data.url]);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, '']);
  };

  const updateIngredient = (index: number, value: string) => {
    setIngredients(prev => {
      const newIngredients = [...prev];
      newIngredients[index] = value;
      return newIngredients;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions(prev => [...prev, '']);
  };

  const updateInstruction = (index: number, value: string) => {
    setInstructions(prev => {
      const newInstructions = [...prev];
      newInstructions[index] = value;
      return newInstructions;
    });
  };

  const removeInstruction = (index: number) => {
    setInstructions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || images.length === 0) {
      alert('Please provide a title and at least one image');
      return;
    }

    setLoading(true);
    try {
      await updatePost(post.id, {
        title,
        caption: caption || undefined,
        visibility,
        media_urls: images,
        ingredients: ingredients.filter(i => i.trim()),
        instructions: instructions.filter(i => i.trim()),
        servings: servings ? Number(servings) : undefined,
        prep_time_minutes: prepTime ? Number(prepTime) : undefined,
        cook_time_minutes: cookTime ? Number(cookTime) : undefined,
        total_time_minutes: prepTime && cookTime ? Number(prepTime) + Number(cookTime) : undefined,
        difficulty: difficulty || undefined,
        cuisine: cuisine || undefined,
        diet_tags: dietTags,
        tags,
        categories: categories.length > 0 ? categories : undefined,
      });

      router.push(`/community/p/${post.id}`);
    } catch (error: any) {
      console.error('Failed to update post:', error);
      alert(error.message || 'Failed to update post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="community-create-form" style={{ width: '100%' }}>
      <div className="community-neon-card" style={{
        padding: 'var(--pad-lg)',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        width: '70%',
        maxWidth: '70%',
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
            {}
            <div className="community-form-section" style={{ width: '100%', maxWidth: '600px' }}>
              <label className="community-form-label">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="e.g., Creamy Garlic Pasta"
                required
              />
            </div>

            {}
            <div className="community-form-section" style={{ width: '100%', maxWidth: '600px' }}>
              <label className="community-form-label">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input"
                placeholder="Share your thoughts about this recipe..."
                rows={3}
                maxLength={2000}
              />
            </div>

            {}
            <div className="community-form-section" style={{ width: '100%', maxWidth: '600px' }}>
              <label className="community-form-label">Images *</label>
              <div className="community-image-upload" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
                {images.map((url, index) => (
                  <div key={index} className="community-image-preview">
                    <Image
                      src={url}
                      alt={`Preview ${index + 1}`}
                      width={200}
                      height={200}
                      className="community-image-preview-img"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="community-image-remove"
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="community-image-upload-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={24} />
                    <span>Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>

            {}
            <div className="community-form-section" style={{ width: '100%', maxWidth: '600px' }}>
              <label className="community-form-label">Visibility</label>
              <div className="chip-row" style={{ gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`chip tap-ripple ${visibility === 'public' ? 'active' : ''}`}
                >
                  <span className="chip-label">Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('friends')}
                  className={`chip tap-ripple ${visibility === 'friends' ? 'active' : ''}`}
                >
                  <span className="chip-label">Friends Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`chip tap-ripple ${visibility === 'private' ? 'active' : ''}`}
                >
                  <span className="chip-label">Private</span>
                </button>
              </div>
            </div>

            {}
            <div className="community-form-section" style={{ width: '100%', maxWidth: '600px' }}>
              <h3 className="cardTitle" style={{ fontSize: 'var(--fs-md)', marginBottom: '12px' }}>
                Recipe Details (Optional)
              </h3>

              {}
              <div className="community-form-row" style={{ justifyContent: 'center' }}>
                <div className="community-form-field">
                  <label className="community-form-label">Servings</label>
                  <input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value ? Number(e.target.value) : '')}
                    className="input"
                    min="1"
                  />
                </div>
                <div className="community-form-field">
                  <label className="community-form-label">Prep Time (min)</label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value ? Number(e.target.value) : '')}
                    className="input"
                    min="0"
                  />
                </div>
                <div className="community-form-field">
                  <label className="community-form-label">Cook Time (min)</label>
                  <input
                    type="number"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value ? Number(e.target.value) : '')}
                    className="input"
                    min="0"
                  />
                </div>
              </div>

              <div className="community-form-row" style={{ marginTop: '12px', justifyContent: 'center' }}>
                <div className="community-form-field">
                  <label className="community-form-label">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="community-form-field">
                  <label className="community-form-label">Cuisine</label>
                  <input
                    type="text"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="input"
                    placeholder="e.g., Italian"
                  />
                </div>
              </div>

              {}
              <div className="community-form-section" style={{ marginTop: '16px' }}>
                <label className="community-form-label">Ingredients</label>
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="community-form-list-item">
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      className="input"
                      placeholder={`Ingredient ${index + 1}`}
                    />
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="community-form-remove-btn"
                        aria-label="Remove ingredient"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="btn ghost tap-ripple"
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={16} style={{ marginRight: '4px' }} />
                  Add Ingredient
                </button>
              </div>

              {}
              <div className="community-form-section" style={{ marginTop: '16px' }}>
                <label className="community-form-label">Instructions</label>
                {instructions.map((instruction, index) => (
                  <div key={index} className="community-form-list-item">
                    <textarea
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      className="input"
                      placeholder={`Step ${index + 1}`}
                      rows={2}
                    />
                    {instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="community-form-remove-btn"
                        aria-label="Remove step"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addInstruction}
                  className="btn ghost tap-ripple"
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={16} style={{ marginRight: '4px' }} />
                  Add Step
                </button>
              </div>

              {}
              <div className="community-form-section" style={{ marginTop: '16px' }}>
                <label className="community-form-label">Dietary Restrictions</label>
                <div ref={dietaryChipsRef} className="chip-row dietary-restrictions-chips">
                  {availableDietOptions.map(diet => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => {
                        if (dietTags.includes(diet)) {
                          setDietTags(dietTags.filter(d => d !== diet));
                        } else {
                          setDietTags([...dietTags, diet]);
                        }
                      }}
                      className={`chip tap-ripple ${dietTags.includes(diet) ? 'active' : ''}`}
                    >
                      <span className="chip-label">{diet}</span>
                    </button>
                  ))}
                </div>
                
                {}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      value={newDietInput}
                      onChange={(e) => {
                        setNewDietInput(e.target.value);
                        setDietError('');
                      }}
                      onKeyPress={handleNewDietKeyPress}
                      className="input"
                      placeholder="Add custom dietary preference..."
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddDietPreference}
                      className="btn tap-ripple"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Plus size={16} style={{ marginRight: '4px' }} />
                      Add
                    </button>
                  </div>
                  {dietError && (
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: 'var(--fs-sm)', 
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px'
                    }}>
                      {dietError}
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className="community-form-section" style={{ marginTop: '16px' }}>
                <label className="community-form-label">Categories</label>
                <div ref={categoryChipsRef} className="chip-row dietary-restrictions-chips">
                  {availableCategoryOptions.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        if (categories.includes(category)) {
                          setCategories(categories.filter(c => c !== category));
                        } else {
                          setCategories([...categories, category]);
                        }
                      }}
                      className={`chip tap-ripple ${categories.includes(category) ? 'active' : ''}`}
                    >
                      <span className="chip-label">{category}</span>
                    </button>
                  ))}
                </div>
                
                {}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => {
                        setNewCategoryInput(e.target.value);
                        setCategoryError('');
                      }}
                      onKeyPress={handleCategoryKeyPress}
                      className="input"
                      placeholder="Add custom category..."
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="btn tap-ripple"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Plus size={16} style={{ marginRight: '4px' }} />
                      Add
                    </button>
                  </div>
                  {categoryError && (
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: 'var(--fs-sm)', 
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px'
                    }}>
                      {categoryError}
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className="community-form-section" style={{ marginTop: '16px' }}>
                <label className="community-form-label">Tags</label>
                <div ref={tagsChipsRef} className="chip-row dietary-restrictions-chips">
                  {availableTagOptions.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (tags.includes(tag)) {
                          setTags(tags.filter(t => t !== tag));
                        } else {
                          setTags([...tags, tag]);
                        }
                      }}
                      className={`chip tap-ripple ${tags.includes(tag) ? 'active' : ''}`}
                    >
                      <span className="chip-label">{tag}</span>
                    </button>
                  ))}
                </div>
                
                {}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={handleTagInputChange}
                      onKeyPress={handleTagKeyPress}
                      className="input"
                      placeholder="#customtag"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="btn tap-ripple"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Plus size={16} style={{ marginRight: '4px' }} />
                      Add
                    </button>
                  </div>
                  {tagError && (
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: 'var(--fs-sm)', 
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px'
                    }}>
                      {tagError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {}
            <div className="toolbar" style={{ marginTop: '24px', justifyContent: 'center', width: '100%' }}>
              <button
                type="submit"
                className="btn tap-ripple"
                disabled={loading || !title || images.length === 0}
              >
                {loading ? 'Updating...' : 'Update Post'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/community/p/${post.id}`)}
                className="btn ghost tap-ripple"
                style={{ marginLeft: '8px' }}
              >
                Cancel
                  </button>
                </div>
          </div>
        </form>
  );
}
