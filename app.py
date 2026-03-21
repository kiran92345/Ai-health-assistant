"""
AI Health Assistant - Flask Backend
Ported from Google Colab notebook: AI_Health_Assistant.ipynb
Random Forest Classifier | 20 Diseases | 142 Symptoms
"""

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import re
import os
import json
import warnings
import io
import base64
from datetime import datetime

warnings.filterwarnings('ignore')

# ML
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# NLP
try:
    from spellchecker import SpellChecker
    SPELL_AVAILABLE = True
except:
    SPELL_AVAILABLE = False

# Translation
try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except:
    TRANSLATOR_AVAILABLE = False

# Language detection
try:
    from langdetect import detect as lang_detect
    LANGDETECT_AVAILABLE = True
except:
    LANGDETECT_AVAILABLE = False

# TTS
try:
    from gtts import gTTS
    TTS_AVAILABLE = True
except:
    TTS_AVAILABLE = False

# PDF
try:
    from fpdf import FPDF
    PDF_AVAILABLE = True
except:
    PDF_AVAILABLE = False

# ─────────────────────────────────────────────────────────────────────────────
# DATASET
# ─────────────────────────────────────────────────────────────────────────────
DISEASE_DATA = {
    'Disease': [
        'Common Cold','Common Cold','Common Cold','Common Cold','Common Cold',
        'Influenza','Influenza','Influenza','Influenza','Influenza',
        'Pneumonia','Pneumonia','Pneumonia','Pneumonia','Pneumonia',
        'Dengue','Dengue','Dengue','Dengue','Dengue',
        'Malaria','Malaria','Malaria','Malaria','Malaria',
        'Typhoid','Typhoid','Typhoid','Typhoid','Typhoid',
        'Tuberculosis','Tuberculosis','Tuberculosis','Tuberculosis','Tuberculosis',
        'Asthma','Asthma','Asthma','Asthma','Asthma',
        'Diabetes','Diabetes','Diabetes','Diabetes','Diabetes',
        'Hypertension','Hypertension','Hypertension','Hypertension','Hypertension',
        'Migraine','Migraine','Migraine','Migraine','Migraine',
        'Gastroenteritis','Gastroenteritis','Gastroenteritis','Gastroenteritis','Gastroenteritis',
        'Urinary Tract Infection','Urinary Tract Infection','Urinary Tract Infection','Urinary Tract Infection','Urinary Tract Infection',
        'Anemia','Anemia','Anemia','Anemia','Anemia',
        'Hepatitis','Hepatitis','Hepatitis','Hepatitis','Hepatitis',
        'COVID-19','COVID-19','COVID-19','COVID-19','COVID-19',
        'Arthritis','Arthritis','Arthritis','Arthritis','Arthritis',
        'Anxiety Disorder','Anxiety Disorder','Anxiety Disorder','Anxiety Disorder','Anxiety Disorder',
        'Appendicitis','Appendicitis','Appendicitis','Appendicitis','Appendicitis',
        'Chickenpox','Chickenpox','Chickenpox','Chickenpox','Chickenpox',
    ],
    'Symptom1': [
        'runny_nose','sneezing','sore_throat','mild_fever','cough',
        'high_fever','body_aches','fatigue','cough','headache',
        'high_fever','cough','shortness_of_breath','chest_pain','chills',
        'high_fever','severe_headache','joint_pain','rash','eye_pain',
        'chills','high_fever','sweating','headache','nausea',
        'prolonged_fever','weakness','abdominal_pain','headache','loss_of_appetite',
        'persistent_cough','blood_in_cough','night_sweats','weight_loss','fatigue',
        'shortness_of_breath','wheezing','chest_tightness','cough','breathlessness',
        'increased_thirst','frequent_urination','fatigue','blurred_vision','slow_healing',
        'headache','dizziness','blurred_vision','chest_pain','shortness_of_breath',
        'severe_headache','nausea','sensitivity_to_light','throbbing_pain','vomiting',
        'nausea','vomiting','diarrhea','abdominal_cramps','fever',
        'burning_urination','frequent_urination','pelvic_pain','cloudy_urine','fever',
        'fatigue','weakness','pale_skin','shortness_of_breath','dizziness',
        'jaundice','fatigue','abdominal_pain','nausea','dark_urine',
        'fever','dry_cough','fatigue','loss_of_taste','loss_of_smell',
        'joint_pain','joint_swelling','stiffness','reduced_range_of_motion','fatigue',
        'excessive_worry','restlessness','fatigue','difficulty_concentrating','irritability',
        'severe_abdominal_pain','nausea','vomiting','fever','loss_of_appetite',
        'itchy_rash','blister_rash','fever','fatigue','loss_of_appetite',
    ],
    'Symptom2': [
        'cough','congestion','runny_nose','sore_throat','sneezing',
        'chills','headache','sore_throat','runny_nose','fatigue',
        'shortness_of_breath','chest_pain','fatigue','fever','sweating',
        'nausea','vomiting','muscle_pain','low_platelet','bleeding',
        'vomiting','shivering','muscle_pain','diarrhea','fatigue',
        'constipation','diarrhea','nausea','rose_spots','vomiting',
        'chest_pain','shortness_of_breath','weakness','coughing_up_blood','low_fever',
        'coughing','breathlessness','fatigue','anxiety','sleep_difficulty',
        'weight_loss','numbness','tingling','slow_healing_wounds','excessive_hunger',
        'nausea','fatigue','irregular_heartbeat','nose_bleed','vision_changes',
        'sensitivity_to_sound','aura','neck_stiffness','fatigue','mood_changes',
        'dehydration','bloody_stool','stomach_pain','weakness','low_fever',
        'urgency_to_urinate','blood_in_urine','back_pain','strong_odor_urine','chills',
        'cold_hands','headache','chest_pain','irregular_heartbeat','pale_nails',
        'loss_of_appetite','vomiting','pale_stool','fever','muscle_pain',
        'shortness_of_breath','body_aches','headache','sore_throat','chills',
        'morning_stiffness','warmth_in_joints','redness','weakness','pain',
        'muscle_tension','sleep_disturbance','heart_palpitations','sweating','shortness_of_breath',
        'tenderness_in_lower_right','rebound_tenderness','diarrhea','constipation','bloating',
        'headache','sore_throat','runny_nose','body_aches','chills',
    ],
    'Symptom3': [
        'fatigue','sore_throat','headache','congestion','fatigue',
        'nausea','vomiting','diarrhea','muscle_pain','chills',
        'coughing_up_blood','body_aches','coughing','sweating','rapid_breathing',
        'abdominal_pain','loss_of_appetite','fatigue','chills','low_platelet',
        'loss_of_appetite','body_aches','sweating','pallor','jaundice',
        'fatigue','diarrhea','bradycardia','abdominal_distension','delirium',
        'loss_of_appetite','fever','pallor','clubbing','lethargy',
        'allergic_reaction','mucus_production','fever','chest_tightness','rapid_breathing',
        'dry_skin','skin_darkening','frequent_infections','sudden_weight_loss','dehydration',
        'anxiety','sleep_apnea','flushing','pounding_heart','tiredness',
        'visual_disturbances','tingling','one_sided_pain','pulsating_pain','dizziness',
        'muscle_aches','headache','chills','loss_of_appetite','fatigue',
        'pain_after_urination','abdominal_bloating','night_sweats','fatigue','weakness',
        'brittle_nails','dark_stool','loss_of_appetite','frequent_headaches','fainting',
        'itching','weight_loss','fever','chills','joint_pain',
        'breathing_difficulty','runny_nose','rash','diarrhea','vomiting',
        'loss_of_appetite','bone_tenderness','fever','night_sweats','weight_loss',
        'panic_attacks','social_avoidance','nausea','trembling','dry_mouth',
        'right_sided_pain','abdominal_rigidity','painful_movement','chills','weakness',
        'red_spots','stomach_cramps','swollen_lymph','mild_fever','itching',
    ]
}

# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDATIONS DATABASE
# ─────────────────────────────────────────────────────────────────────────────
RECOMMENDATIONS = {
    'Common Cold': {
        'precautions': ['Rest adequately', 'Stay warm', 'Avoid cold drinks', 'Cover mouth when sneezing', 'Wash hands frequently'],
        'foods_to_eat': ['Warm soups and broths', 'Ginger tea with honey', 'Citrus fruits (Vitamin C)', 'Garlic and turmeric', 'Warm water with lemon'],
        'foods_to_avoid': ['Cold beverages and ice cream', 'Dairy products (increase mucus)', 'Fried and oily foods', 'Alcohol', 'Processed foods'],
        'medical_suggestions': ['OTC antihistamines for runny nose', 'Decongestants for nasal congestion', 'Paracetamol for fever (if >38.5°C)', 'Steam inhalation twice daily', 'Saline nasal spray'],
        'doctor_when': 'Fever persists >3 days, difficulty breathing, severe sore throat, or symptoms worsen after 7 days',
    },
    'Influenza': {
        'precautions': ['Bed rest — avoid strenuous activity', 'Stay home to prevent spread', 'Use separate utensils', 'Wear mask if around others', 'Hydrate frequently'],
        'foods_to_eat': ['Chicken soup', 'Electrolyte drinks', 'Bananas and toast (BRAT diet)', 'Honey and ginger', 'Warm herbal teas'],
        'foods_to_avoid': ['Alcohol and caffeine (dehydrating)', 'Sugary drinks', 'Heavy fatty meals', 'Dairy during nausea'],
        'medical_suggestions': ['Antiviral medications (Oseltamivir if within 48h onset)', 'Paracetamol or ibuprofen for body aches', 'Adequate hydration (2-3L/day)', 'Annual flu vaccine for prevention'],
        'doctor_when': 'High fever >39.5°C, difficulty breathing, chest pain, confusion, or no improvement in 5 days',
    },
    'Pneumonia': {
        'precautions': ['URGENT: Consult doctor immediately', 'Complete bed rest', 'Avoid smoke and pollutants', 'Keep warm', 'Breathing exercises as tolerated'],
        'foods_to_eat': ['High-protein foods (eggs, lean meat, legumes)', 'Vitamin C rich fruits', 'Warm fluids and soups', 'Anti-inflammatory turmeric milk', 'Easily digestible foods'],
        'foods_to_avoid': ['Smoking/tobacco completely', 'Cold foods', 'Processed and junk food', 'Alcohol', 'Hard to digest meals'],
        'medical_suggestions': ['Antibiotics (requires prescription)', 'Bronchodilators if wheezing', 'Oxygen therapy if SpO2 low', 'Chest physiotherapy', 'Pneumococcal vaccine for prevention'],
        'doctor_when': '⚠️ IMMEDIATE — This condition requires urgent medical evaluation and likely hospitalization',
    },
    'Dengue': {
        'precautions': ['Prevent mosquito bites (repellent, full clothing)', 'Avoid aspirin/ibuprofen (bleeding risk)', 'Monitor platelet count', 'Rest completely', 'Eliminate stagnant water around home'],
        'foods_to_eat': ['Papaya leaf juice (raises platelets)', 'Pomegranate juice', 'Coconut water for hydration', 'Kiwi and citrus fruits', 'Light khichdi or porridge'],
        'foods_to_avoid': ['Oily and spicy foods', 'Fatty meats', 'Caffeine and alcohol', 'Spicy foods that irritate stomach'],
        'medical_suggestions': ['Only Paracetamol for fever (NOT aspirin)', 'IV fluids if dehydration severe', 'Platelet monitoring every 24-48h', 'Hospitalization if platelets <100,000'],
        'doctor_when': 'Bleeding from gums/nose, severe vomiting, sudden drop in fever with weakness, platelet count falling — seek emergency care',
    },
    'Malaria': {
        'precautions': ['Sleep under insecticide-treated nets', 'Use mosquito repellents', 'Wear long sleeves at dusk/dawn', 'Antimalarial prophylaxis when traveling', 'Eliminate breeding sites'],
        'foods_to_eat': ['Light, easily digestible meals', 'Rice, dal, khichdi', 'Fruit juices and coconut water', 'Turmeric milk', 'Ginger and tulsi tea'],
        'foods_to_avoid': ['Raw or undercooked food', 'High-fat heavy meals', 'Alcohol', 'Excess sugar'],
        'medical_suggestions': ['Antimalarials (Chloroquine/Artemisinin — doctor prescribed)', 'Paracetamol for fever management', 'IV therapy if severe/cerebral malaria', 'Blood smear test confirmation essential'],
        'doctor_when': 'Malaria requires immediate medical testing and prescription treatment — do not delay',
    },
    'Typhoid': {
        'precautions': ['Drink only boiled/bottled water', 'Eat only thoroughly cooked food', 'Practice strict hand hygiene', 'Avoid street food', 'Complete full antibiotic course'],
        'foods_to_eat': ['Boiled rice and dal', 'Boiled eggs', 'Ripe banana', 'Soft khichdi', 'Coconut water', 'Well-cooked vegetables'],
        'foods_to_avoid': ['Raw vegetables and salads', 'Street food', 'Spicy food', 'High-fiber foods', 'Milk and dairy until recovery'],
        'medical_suggestions': ['Fluoroquinolone antibiotics (prescription)', 'Ceftriaxone for severe cases', 'Oral rehydration salts', 'Typhoid vaccine for prevention'],
        'doctor_when': 'Requires stool/blood culture confirmation and antibiotic prescription — see doctor within 24-48 hours',
    },
    'Tuberculosis': {
        'precautions': ['Cover mouth while coughing', 'Use separate room/ventilated space', 'Complete full DOT (6+ months) treatment', 'Regular sputum tests', 'BCG vaccination for prevention'],
        'foods_to_eat': ['High-calorie nutritious diet', 'Eggs, meat, paneer (protein)', 'Whole grains', 'Leafy vegetables (iron)', 'Vitamin D — sunlight + fortified foods'],
        'foods_to_avoid': ['Alcohol (interferes with treatment)', 'Tobacco', 'Junk food', 'Excess caffeine'],
        'medical_suggestions': ['DOTS regimen — isoniazid, rifampicin, pyrazinamide, ethambutol', 'Never stop treatment early', 'Chest X-ray monitoring', 'Contact tracing of family members'],
        'doctor_when': 'TB requires confirmed diagnosis via tests and must be treated under doctor supervision — visit DOTS center',
    },
    'Asthma': {
        'precautions': ['Avoid known triggers (dust, pollen, smoke)', 'Keep rescue inhaler accessible always', 'Avoid exercise in cold/dry air without warm-up', 'Use air purifier indoors', 'Regular peak flow monitoring'],
        'foods_to_eat': ['Ginger and turmeric (anti-inflammatory)', 'Honey', 'Apples and berries', 'Omega-3 rich foods (fish, flaxseed)', 'Magnesium-rich foods (spinach, nuts)'],
        'foods_to_avoid': ['Sulfite-containing foods (wine, dried fruits)', 'Cold foods', 'Aspirin-containing foods if sensitive', 'Food allergens (dairy, nuts, eggs if allergic)'],
        'medical_suggestions': ['Short-acting beta-agonists (Salbutamol inhaler)', 'Inhaled corticosteroids for maintenance', 'Leukotriene modifiers', 'Allergy testing to identify triggers', 'Flu vaccine annually'],
        'doctor_when': 'Severe breathlessness not relieved by inhaler, lips turning blue, inability to speak — call emergency immediately',
    },
    'Diabetes': {
        'precautions': ['Monitor blood glucose regularly', 'Check feet daily for sores', 'Take medication as prescribed without missing', 'Regular HbA1c testing', 'Wear medic-alert ID'],
        'foods_to_eat': ['Whole grains (oats, brown rice)', 'Non-starchy vegetables', 'Legumes and pulses', 'Lean proteins', 'Low-GI fruits (berries, apple, pear)'],
        'foods_to_avoid': ['Refined sugar and sweets', 'White bread, white rice, maida', 'Sugary drinks and juices', 'Processed meats', 'Fried foods and trans fats'],
        'medical_suggestions': ['Metformin (Type 2, prescription)', 'Insulin therapy as required', 'ACE inhibitors for kidney protection', 'Regular eye and kidney checkups', 'Podiatry consultations'],
        'doctor_when': 'Blood sugar >300 mg/dL, severe confusion, inability to eat, signs of infection or wound not healing — urgent care',
    },
    'Hypertension': {
        'precautions': ['Monitor BP twice daily', 'Reduce stress with meditation', 'Regular moderate exercise (30 min/day)', 'Limit sodium <1500mg/day', 'Quit smoking'],
        'foods_to_eat': ['Potassium-rich foods (bananas, spinach, potato)', 'Beets and pomegranate juice', 'Fatty fish', 'Garlic', 'Low-fat dairy (calcium)'],
        'foods_to_avoid': ['Table salt and high-sodium foods', 'Processed and canned foods', 'Pickles and papads', 'Alcohol', 'Caffeine in excess'],
        'medical_suggestions': ['ACE inhibitors / ARBs (prescription)', 'Beta-blockers or calcium channel blockers', 'Low-dose aspirin (doctor-advised)', 'Cardiac evaluation if BP >180/120'],
        'doctor_when': 'BP >180/120 mmHg, severe headache with vision changes, chest pain or confusion — hypertensive emergency, go to ER',
    },
    'Migraine': {
        'precautions': ['Keep a trigger diary', 'Maintain regular sleep schedule', 'Avoid skipping meals', 'Reduce screen time', 'Dark quiet room during attack'],
        'foods_to_eat': ['Magnesium-rich foods (spinach, seeds)', 'Ginger tea', 'Hydrating foods', 'Riboflavin (B2) rich foods', 'Omega-3 foods'],
        'foods_to_avoid': ['Red wine and alcohol', 'Aged cheese', 'Processed meats with nitrates', 'Chocolate (trigger for some)', 'Caffeine (can trigger or worsen)'],
        'medical_suggestions': ['Triptans for acute attacks (prescription)', 'NSAIDs (ibuprofen, naproxen)', 'Anti-nausea medications', 'Topiramate/Propranolol for prevention', 'Cold compress on forehead/neck'],
        'doctor_when': 'Worst headache of life, headache with fever and stiff neck, neurological symptoms, headaches >15 days/month',
    },
    'Gastroenteritis': {
        'precautions': ['Strict hand hygiene', 'Stay hydrated with ORS', 'Rest bowel with light foods', 'Avoid sharing utensils', 'BRAT diet initially'],
        'foods_to_eat': ['Rice water (kanji)', 'Banana', 'Boiled potato', 'Clear broth', 'ORS / electrolyte solutions', 'Plain curd (probiotics)'],
        'foods_to_avoid': ['Dairy (except probiotics)', 'Fried and spicy foods', 'Raw vegetables', 'Caffeinated drinks', 'Alcohol', 'High-fiber foods initially'],
        'medical_suggestions': ['Oral rehydration salts (ORS)', 'Zinc supplements for children', 'Probiotics (Lactobacillus)', 'Loperamide if diarrhea severe (adults)', 'Avoid antibiotics unless prescribed'],
        'doctor_when': 'Blood in stool, severe dehydration (sunken eyes, no tears, no urination), high fever, or symptoms >3 days',
    },
    'Urinary Tract Infection': {
        'precautions': ['Drink 2-3L water daily', 'Urinate after intercourse', 'Wipe front to back', 'Avoid holding urine', 'Wear cotton underwear'],
        'foods_to_eat': ['Cranberry juice (unsweetened)', 'Water and herbal teas', 'Vitamin C foods', 'Probiotics (curd)', 'Blueberries'],
        'foods_to_avoid': ['Alcohol and caffeine', 'Spicy foods', 'Artificial sweeteners', 'Citric acid if irritating', 'Carbonated drinks'],
        'medical_suggestions': ['Trimethoprim-sulfamethoxazole or nitrofurantoin (prescription)', 'Urine culture for antibiotic sensitivity', 'Phenazopyridine for pain relief', 'Complete full antibiotic course'],
        'doctor_when': 'Fever with chills (kidney involvement), blood in urine, back/flank pain, pregnancy, recurrent infections',
    },
    'Anemia': {
        'precautions': ['Take iron supplements with vitamin C', 'Avoid tea/coffee with meals', 'Regular CBC monitoring', 'Treat underlying cause', 'Energy conservation strategies'],
        'foods_to_eat': ['Dark leafy greens (spinach, fenugreek)', 'Liver and red meat', 'Legumes and pulses', 'Fortified cereals', 'Vitamin B12 rich foods (eggs, fish)', 'Jaggery and dates'],
        'foods_to_avoid': ['Tea and coffee with meals (block iron)', 'High-calcium foods with iron supplements', 'Alcohol', 'Phytate-rich foods in excess'],
        'medical_suggestions': ['Iron supplements (ferrous sulfate)', 'Vitamin B12 injections if deficient', 'Folic acid supplementation', 'Erythropoietin in chronic cases', 'Blood transfusion if Hb <7g/dL'],
        'doctor_when': 'Hb <8 g/dL, severe fatigue, chest pain, rapid heartbeat, shortness of breath at rest',
    },
    'Hepatitis': {
        'precautions': ['Complete alcohol abstinence', 'Practice safe sex', 'Use sterile needles only', 'Hepatitis A/B vaccination', 'Avoid sharing personal items'],
        'foods_to_eat': ['Low-fat, high-carbohydrate diet', 'Fruits and vegetables', 'Whole grains', 'Adequate protein (plant-based if severe)', 'Stay well hydrated'],
        'foods_to_avoid': ['Alcohol (absolutely)', 'Fatty and fried foods', 'Red meat in large quantities', 'Raw shellfish', 'High-sodium foods', 'Iron supplements unless prescribed'],
        'medical_suggestions': ['Antiviral therapy (Hep B/C — specialist)', 'Interferon in select cases', 'Liver function tests regularly', 'Avoid hepatotoxic drugs (paracetamol excess)', 'Gastroenterology referral'],
        'doctor_when': 'Jaundice, severe abdominal pain, mental confusion, swollen abdomen (ascites) — urgent hepatology evaluation needed',
    },
    'COVID-19': {
        'precautions': ['Self-isolate immediately', 'Wear N95 mask around others', 'Monitor oxygen levels (SpO2) with pulse oximeter', 'Contact tracing', 'Follow government health guidelines'],
        'foods_to_eat': ['Vitamin C rich foods', 'Zinc-rich foods (seeds, nuts)', 'Vitamin D (egg yolks, fish)', 'Ginger-turmeric tea', 'Protein-rich foods for recovery'],
        'foods_to_avoid': ['Processed and fast food', 'Sugary drinks', 'Alcohol', 'Foods that suppress immunity'],
        'medical_suggestions': ['Paracetamol for fever/pain', 'Anticoagulants if risk of clots (prescription)', 'Monoclonal antibodies for high-risk early cases', 'Oxygen therapy if SpO2 <94%', 'Vaccination for prevention'],
        'doctor_when': 'SpO2 <94%, persistent chest pain, severe breathlessness, confusion, lips turning blue — emergency care immediately',
    },
    'Arthritis': {
        'precautions': ['Gentle range-of-motion exercises daily', 'Use joint protection techniques', 'Maintain healthy weight (reduces joint load)', 'Apply hot/cold packs', 'Physiotherapy'],
        'foods_to_eat': ['Omega-3 fatty acids (fish, flaxseed, walnuts)', 'Turmeric and ginger (anti-inflammatory)', 'Colorful vegetables and fruits', 'Whole grains', 'Green tea'],
        'foods_to_avoid': ['Processed and fried foods', 'Refined sugars', 'Red meat in excess', 'Alcohol', 'Excess salt'],
        'medical_suggestions': ['NSAIDs for pain (ibuprofen, naproxen)', 'DMARDs for rheumatoid arthritis (prescription)', 'Corticosteroid injections', 'Physiotherapy and OT', 'Joint replacement surgery (severe cases)'],
        'doctor_when': 'Sudden joint swelling with warmth (rule out gout/septic arthritis), inability to perform daily activities',
    },
    'Anxiety Disorder': {
        'precautions': ['Daily mindfulness or meditation (10-15 min)', 'Regular aerobic exercise', 'Limit caffeine and alcohol', 'Maintain regular sleep schedule', 'Journaling and breathing exercises'],
        'foods_to_eat': ['Magnesium-rich foods (spinach, almonds)', 'Complex carbohydrates (oats, whole grains)', 'Omega-3 foods', 'Dark chocolate (moderate)', 'Chamomile and lavender tea'],
        'foods_to_avoid': ['Caffeine and energy drinks', 'Alcohol', 'High-sugar foods', 'Processed and junk food', 'Excessive salt'],
        'medical_suggestions': ['CBT (Cognitive Behavioral Therapy) — first line', 'SSRIs/SNRIs (if prescribed)', 'Benzodiazepines only short-term', 'Beta-blockers for physical symptoms', 'Mindfulness-based stress reduction (MBSR)'],
        'doctor_when': 'Anxiety interfering with daily function, panic attacks, suicidal thoughts — see mental health professional promptly',
    },
    'Appendicitis': {
        'precautions': ['⚠️ MEDICAL EMERGENCY — Do not eat or drink', 'Go to ER immediately', 'Do NOT apply heat to abdomen', 'Do NOT take laxatives', 'Do NOT delay — ruptured appendix is life-threatening'],
        'foods_to_eat': ['Post-surgery: clear liquids → soft foods → normal diet gradually'],
        'foods_to_avoid': ['ALL food and water until evaluated by surgeon'],
        'medical_suggestions': ['Surgical appendectomy (emergency)', 'Antibiotics pre-operative', 'IV fluids and pain management in hospital', 'Laparoscopic vs open surgery by surgeon decision'],
        'doctor_when': '⚠️ IMMEDIATELY — Go to emergency room now. Appendicitis requires surgery.',
    },
    'Chickenpox': {
        'precautions': ['Isolate from unvaccinated/immunocompromised individuals', 'Trim nails to prevent scratching', 'Use calamine lotion on blisters', 'Avoid scratching (scarring + infection)', 'Cool baths with oatmeal or baking soda'],
        'foods_to_eat': ['Soft, easy-to-swallow foods', 'Cold yogurt and ice pops', 'Fruits and vegetables', 'Adequate hydration', 'Vitamin C foods for healing'],
        'foods_to_avoid': ['Spicy and salty foods (irritate mouth sores)', 'Acidic foods (citrus during active phase)', 'Hard crunchy foods'],
        'medical_suggestions': ['Antihistamines for itching (cetirizine, diphenhydramine)', 'Calamine lotion topically', 'Paracetamol for fever (NOT aspirin — Reye syndrome risk)', 'Acyclovir for immunocompromised or severe cases', 'Varicella vaccine for prevention'],
        'doctor_when': 'Secondary bacterial skin infection, pneumonia signs, neurological symptoms, immunocompromised patients — see doctor',
    },
}

EMERGENCY_SYMPTOMS = {
    'chest_pain', 'shortness_of_breath', 'blood_in_cough', 'coughing_up_blood',
    'severe_abdominal_pain', 'abdominal_rigidity', 'rebound_tenderness',
    'loss_of_consciousness', 'fainting', 'seizure', 'paralysis',
    'severe_headache', 'sudden_vision_loss', 'blood_in_urine', 'bloody_stool',
}
MODERATE_SYMPTOMS = {
    'high_fever', 'persistent_cough', 'night_sweats', 'weight_loss',
    'jaundice', 'joint_swelling', 'severe_fatigue', 'vomiting',
    'prolonged_fever', 'breathing_difficulty', 'blurred_vision',
    'dehydration', 'pallor', 'rapid_breathing', 'palpitations',
}
EMERGENCY_DISEASES = {'Appendicitis', 'Pneumonia'}
MODERATE_DISEASES = {'Dengue', 'Malaria', 'Tuberculosis', 'Hepatitis', 'COVID-19', 'Typhoid'}

SYNONYM_MAP = {
    'temperature':'fever','high_temperature':'high_fever','pyrexia':'fever','febrile':'fever','feverish':'fever','temp':'fever',
    'coughing':'cough','dry_cough':'cough','wet_cough':'cough','productive_cough':'cough','persistent_cough':'cough',
    'pain':'body_aches','ache':'body_aches','aches':'body_aches','soreness':'sore_throat','throat_pain':'sore_throat',
    'stomach_ache':'abdominal_pain','belly_pain':'abdominal_pain','stomachache':'abdominal_pain','tummy_ache':'abdominal_pain',
    'chest_ache':'chest_pain','back_ache':'back_pain','joint_ache':'joint_pain','head_pain':'headache',
    'breathlessness':'shortness_of_breath','difficulty_breathing':'shortness_of_breath','cant_breathe':'shortness_of_breath',
    'breathing_difficulty':'shortness_of_breath','sob':'shortness_of_breath','dyspnea':'shortness_of_breath',
    'runny_nose':'runny_nose','blocked_nose':'congestion','stuffy_nose':'congestion','nasal_congestion':'congestion','nose_block':'congestion',
    'sneezes':'sneezing','sniffles':'runny_nose',
    'loose_stools':'diarrhea','loose_motions':'diarrhea','watery_stools':'diarrhea',
    'puking':'vomiting','throwing_up':'vomiting','sick_feeling':'nausea','nauseous':'nausea','queasy':'nausea',
    'tired':'fatigue','tiredness':'fatigue','exhaustion':'fatigue','exhausted':'fatigue','lethargy':'fatigue','lethargic':'fatigue',
    'weakness':'weakness','weak':'weakness',
    'migraine':'severe_headache','head_ache':'headache','headaches':'headache',
    'itching':'itchy_rash','itchiness':'itchy_rash','skin_rash':'rash','spots':'rash',
    'red_eyes':'eye_pain','watery_eyes':'eye_pain','blurry_vision':'blurred_vision',
    'blocked':'congestion','phlegm':'cough','mucus':'cough','sputum':'cough',
    'burning_pee':'burning_urination','painful_urination':'burning_urination',
    'frequent_pee':'frequent_urination','urinary_frequency':'frequent_urination',
    'anxiety':'excessive_worry','anxious':'excessive_worry','worried':'excessive_worry','panic':'panic_attacks','stress':'excessive_worry',
    'sweats':'sweating','night_sweat':'night_sweats','shivering':'chills','shiver':'chills','trembling':'trembling','redness':'redness',
    'swelling':'joint_swelling','swollen':'joint_swelling',
    'weight_loss':'weight_loss','losing_weight':'weight_loss',
    'no_appetite':'loss_of_appetite','loss_appetite':'loss_of_appetite',
    'cant_taste':'loss_of_taste','no_taste':'loss_of_taste',
    'no_smell':'loss_of_smell','cant_smell':'loss_of_smell',
    'yellow_skin':'jaundice','yellow_eyes':'jaundice','yellowish':'jaundice',
    'dark_urine':'dark_urine','blood_urine':'blood_in_urine',
}

LANG_TO_CODE = {
    'English': 'en', 'Telugu': 'te', 'Tamil': 'ta',
    'Kannada': 'kn', 'Malayalam': 'ml', 'Hindi': 'hi',
}

TTS_LANG_CODE = {
    'English': 'en', 'Telugu': 'te', 'Tamil': 'ta',
    'Kannada': 'kn', 'Malayalam': 'ml', 'Hindi': 'hi',
}

# ─────────────────────────────────────────────────────────────────────────────
# QUICK ASSESSMENT LOOKUP TABLES (1-2 SYMPTOMS)
# ─────────────────────────────────────────────────────────────────────────────
SINGLE_SYMPTOM_COMMON = {
    'fever'               : [('Common Cold',0.60),('Influenza',0.25),('Malaria',0.15)],
    'high_fever'          : [('Influenza',0.50),('Malaria',0.30),('Dengue',0.20)],
    'headache'            : [('Common Cold',0.55),('Migraine',0.28),('Hypertension',0.17)],
    'severe_headache'     : [('Migraine',0.65),('Hypertension',0.25),('Influenza',0.10)],
    'cough'               : [('Common Cold',0.65),('Influenza',0.22),('Asthma',0.13)],
    'persistent_cough'    : [('Asthma',0.50),('Tuberculosis',0.30),('Common Cold',0.20)],
    'runny_nose'          : [('Common Cold',0.82),('Influenza',0.13),('Anemia',0.05)],
    'sneezing'            : [('Common Cold',0.78),('Influenza',0.15),('Anemia',0.07)],
    'sore_throat'         : [('Common Cold',0.68),('Influenza',0.24),('COVID-19',0.08)],
    'fatigue'             : [('Common Cold',0.42),('Anemia',0.33),('Influenza',0.25)],
    'weakness'            : [('Anemia',0.52),('Common Cold',0.28),('Influenza',0.20)],
    'body_aches'          : [('Influenza',0.58),('Common Cold',0.28),('Malaria',0.14)],
    'muscle_pain'         : [('Influenza',0.55),('Dengue',0.25),('Common Cold',0.20)],
    'nausea'              : [('Gastroenteritis',0.55),('Influenza',0.25),('Common Cold',0.20)],
    'vomiting'            : [('Gastroenteritis',0.62),('Influenza',0.22),('Typhoid',0.16)],
    'diarrhea'            : [('Gastroenteritis',0.72),('Typhoid',0.18),('Influenza',0.10)],
    'abdominal_pain'      : [('Gastroenteritis',0.55),('Appendicitis',0.25),('Urinary Tract Infection',0.20)],
    'stomach_pain'        : [('Gastroenteritis',0.60),('Appendicitis',0.22),('Urinary Tract Infection',0.18)],
    'chills'              : [('Malaria',0.48),('Influenza',0.35),('Common Cold',0.17)],
    'sweating'            : [('Malaria',0.45),('Influenza',0.35),('Hypertension',0.20)],
    'night_sweats'        : [('Tuberculosis',0.52),('Malaria',0.28),('Anemia',0.20)],
    'dizziness'           : [('Anemia',0.48),('Hypertension',0.32),('Migraine',0.20)],
    'joint_pain'          : [('Arthritis',0.50),('Dengue',0.30),('Influenza',0.20)],
    'chest_pain'          : [('Anxiety Disorder',0.42),('Hypertension',0.35),('Asthma',0.23)],
    'shortness_of_breath' : [('Asthma',0.55),('Anxiety Disorder',0.28),('Anemia',0.17)],
    'rash'                : [('Chickenpox',0.48),('Dengue',0.32),('Common Cold',0.20)],
    'itchy_rash'          : [('Chickenpox',0.52),('Anemia',0.30),('Dengue',0.18)],
    'jaundice'            : [('Hepatitis',0.68),('Anemia',0.18),('Typhoid',0.14)],
    'loss_of_appetite'    : [('Typhoid',0.40),('Hepatitis',0.32),('Anemia',0.28)],
    'weight_loss'         : [('Tuberculosis',0.45),('Diabetes',0.35),('Anemia',0.20)],
    'frequent_urination'  : [('Diabetes',0.58),('Urinary Tract Infection',0.32),('Hypertension',0.10)],
    'burning_urination'   : [('Urinary Tract Infection',0.82),('Diabetes',0.12),('Anemia',0.06)],
    'pale_skin'           : [('Anemia',0.72),('Hepatitis',0.18),('Hypertension',0.10)],
    'blurred_vision'      : [('Diabetes',0.52),('Hypertension',0.35),('Migraine',0.13)],
    'congestion'          : [('Common Cold',0.78),('Influenza',0.17),('Asthma',0.05)],
    'sensitivity_to_light': [('Migraine',0.68),('Common Cold',0.20),('Influenza',0.12)],
    'eye_pain'            : [('Dengue',0.52),('Migraine',0.30),('Common Cold',0.18)],
    'palpitations'        : [('Anxiety Disorder',0.50),('Hypertension',0.32),('Anemia',0.18)],
    'breathlessness'      : [('Asthma',0.55),('Anemia',0.25),('Anxiety Disorder',0.20)],
    'wheezing'            : [('Asthma',0.70),('Common Cold',0.20),('Anemia',0.10)],
    'back_pain'           : [('Urinary Tract Infection',0.40),('Arthritis',0.38),('Anemia',0.22)],
}

TWO_SYMPTOM_COMMON = {
    frozenset(['fever','headache'])                     : [('Common Cold',0.55),('Influenza',0.30),('Malaria',0.15)],
    frozenset(['fever','cough'])                        : [('Common Cold',0.62),('Influenza',0.28),('COVID-19',0.10)],
    frozenset(['fever','body_aches'])                   : [('Influenza',0.62),('Dengue',0.22),('Malaria',0.16)],
    frozenset(['fever','chills'])                       : [('Malaria',0.58),('Influenza',0.28),('Dengue',0.14)],
    frozenset(['fever','vomiting'])                     : [('Malaria',0.45),('Gastroenteritis',0.35),('Dengue',0.20)],
    frozenset(['fever','rash'])                         : [('Chickenpox',0.52),('Dengue',0.30),('Anemia',0.18)],
    frozenset(['fever','runny_nose'])                   : [('Common Cold',0.68),('Influenza',0.24),('COVID-19',0.08)],
    frozenset(['fever','sore_throat'])                  : [('Common Cold',0.62),('Influenza',0.28),('COVID-19',0.10)],
    frozenset(['fever','joint_pain'])                   : [('Dengue',0.55),('Malaria',0.30),('Influenza',0.15)],
    frozenset(['headache','nausea'])                    : [('Migraine',0.62),('Common Cold',0.22),('Hypertension',0.16)],
    frozenset(['headache','dizziness'])                 : [('Hypertension',0.52),('Migraine',0.32),('Anemia',0.16)],
    frozenset(['headache','sensitivity_to_light'])      : [('Migraine',0.78),('Hypertension',0.14),('Influenza',0.08)],
    frozenset(['cough','sore_throat'])                  : [('Common Cold',0.72),('Influenza',0.20),('COVID-19',0.08)],
    frozenset(['cough','shortness_of_breath'])          : [('Asthma',0.62),('Pneumonia',0.22),('COVID-19',0.16)],
    frozenset(['cough','fever'])                        : [('Common Cold',0.58),('Influenza',0.28),('COVID-19',0.14)],
    frozenset(['nausea','vomiting'])                    : [('Gastroenteritis',0.68),('Influenza',0.22),('Typhoid',0.10)],
    frozenset(['vomiting','diarrhea'])                  : [('Gastroenteritis',0.78),('Typhoid',0.14),('Malaria',0.08)],
    frozenset(['fatigue','dizziness'])                  : [('Anemia',0.65),('Hypertension',0.22),('Diabetes',0.13)],
    frozenset(['fatigue','weakness'])                   : [('Anemia',0.62),('Common Cold',0.22),('Diabetes',0.16)],
    frozenset(['fatigue','headache'])                   : [('Common Cold',0.55),('Anemia',0.28),('Influenza',0.17)],
    frozenset(['frequent_urination','fatigue'])         : [('Diabetes',0.65),('Urinary Tract Infection',0.22),('Anemia',0.13)],
    frozenset(['burning_urination','frequent_urination']): [('Urinary Tract Infection',0.88),('Diabetes',0.08),('Anemia',0.04)],
    frozenset(['chest_pain','shortness_of_breath'])     : [('Asthma',0.45),('Anxiety Disorder',0.35),('Pneumonia',0.20)],
    frozenset(['night_sweats','cough'])                 : [('Tuberculosis',0.62),('COVID-19',0.22),('Pneumonia',0.16)],
    frozenset(['weight_loss','fatigue'])                : [('Tuberculosis',0.40),('Diabetes',0.35),('Anemia',0.25)],
    frozenset(['jaundice','fatigue'])                   : [('Hepatitis',0.72),('Anemia',0.18),('Typhoid',0.10)],
    frozenset(['high_fever','chills'])                  : [('Malaria',0.62),('Dengue',0.22),('Typhoid',0.16)],
    frozenset(['sneezing','runny_nose'])                : [('Common Cold',0.82),('Influenza',0.12),('Anemia',0.06)],
    frozenset(['sneezing','cough'])                     : [('Common Cold',0.78),('Influenza',0.16),('Anemia',0.06)],
    frozenset(['dizziness','weakness'])                 : [('Anemia',0.65),('Hypertension',0.22),('Diabetes',0.13)],
    frozenset(['joint_pain','fatigue'])                 : [('Arthritis',0.52),('Dengue',0.28),('Anemia',0.20)],
    frozenset(['rash','itchy_rash'])                    : [('Chickenpox',0.65),('Anemia',0.22),('Dengue',0.13)],
    frozenset(['blurred_vision','frequent_urination'])  : [('Diabetes',0.78),('Hypertension',0.16),('Anemia',0.06)],
    frozenset(['back_pain','burning_urination'])        : [('Urinary Tract Infection',0.75),('Anemia',0.15),('Arthritis',0.10)],
    frozenset(['palpitations','dizziness'])             : [('Anxiety Disorder',0.52),('Hypertension',0.32),('Anemia',0.16)],
    frozenset(['wheezing','cough'])                     : [('Asthma',0.72),('Common Cold',0.18),('Pneumonia',0.10)],
    frozenset(['headache','fatigue'])                   : [('Common Cold',0.50),('Anemia',0.30),('Influenza',0.20)],
    frozenset(['nausea','headache'])                    : [('Migraine',0.58),('Common Cold',0.25),('Gastroenteritis',0.17)],
}

BASIC_MEDICATION = {
    'Common Cold': [
        'Paracetamol 500mg — for fever/discomfort (every 6 hrs, max 4 doses/day)',
        'Cetirizine 10mg — for runny nose & sneezing (once at bedtime)',
        'Steam inhalation with Vicks/eucalyptus oil — 2-3 times daily',
        'Vitamin C 500mg daily — boosts immunity',
        'Saline nasal spray — relieves nasal congestion',
        'Warm ginger-honey tea — soothing for throat and cold',
    ],
    'Influenza': [
        'Paracetamol 500-650mg — for fever and body aches (every 6 hrs)',
        'Ibuprofen 400mg with food — for muscle pain (if no stomach issues)',
        'ORS or coconut water — stay hydrated throughout the day',
        'Complete bed rest — minimum 5-7 days',
        'Antihistamine (Cetirizine) — for sneezing and runny nose',
    ],
    'Migraine': [
        'Ibuprofen 400mg at very first sign — works best when taken early',
        'Paracetamol 500-1000mg — alternative to ibuprofen',
        'Dark quiet room + cold or warm compress on forehead',
        'Avoid all screens (phone, laptop, TV) during attack',
        'Anti-nausea: Domperidone 10mg (OTC) if nausea accompanies headache',
        'See a doctor if attacks occur more than 4 times/month',
    ],
    'Gastroenteritis': [
        'ORS (Oral Rehydration Salts) — MOST IMPORTANT: drink after every loose stool',
        'Zinc 20mg/day for 10-14 days (especially important for children)',
        'Probiotic curd or Lactobacillus supplement — helps restore gut flora',
        'BRAT Diet: Banana, Rice, Applesauce, Plain Toast during recovery',
        'Avoid antidiarrheal tablets unless prescribed by a doctor',
    ],
    'Anemia': [
        'Ferrous Sulfate 325mg — once daily on empty stomach (take with Vitamin C)',
        'Vitamin C (100-200mg) alongside iron tablet — doubles absorption',
        'Do NOT take iron with tea, coffee, or calcium supplements',
        'Continue iron supplementation for 3 months even after feeling better',
        'CBC blood test essential to confirm type and severity of anemia',
    ],
    'Hypertension': [
        'Do NOT self-medicate BP drugs — requires doctor prescription',
        'Immediately avoid all salt, pickles, papads, and processed foods',
        'Measure BP twice daily and keep a log',
        'Deep breathing (4-7-8 technique) 3 times daily reduces BP naturally',
        'Brisk walking 30 minutes daily is highly effective',
    ],
    'Urinary Tract Infection': [
        'Drink 3+ litres of plain water daily — flushes bacteria out',
        'Phenazopyridine (Uristat/Pyridium) — OTC for burning pain relief only',
        'Unsweetened cranberry juice (200ml twice daily) — prevents recurrence',
        'Complete antibiotic course REQUIRED — see doctor for prescription',
        'Avoid caffeine, alcohol, and spicy foods until fully recovered',
    ],
    'Asthma': [
        'Use Salbutamol rescue inhaler immediately during any breathing difficulty',
        'Sit upright, stay calm, take slow deep breaths during attack',
        'Remove yourself from all triggers: dust, smoke, cold air, pollen',
        'Preventer inhaler (ICS) — use daily as prescribed, do NOT skip',
        'Keep a trigger diary to identify and avoid personal triggers',
    ],
    'Malaria': [
        '⚠ DO NOT SELF-MEDICATE — blood test required for diagnosis',
        'Paracetamol ONLY for fever control',
        'ORS and fluids for hydration',
        'See a doctor or go to a government hospital URGENTLY within 24 hours',
    ],
    'Dengue': [
        '⚠ NEVER take aspirin or ibuprofen — extremely dangerous bleeding risk',
        'Paracetamol 500mg ONLY for fever and pain',
        'Papaya leaf juice (30ml twice daily) — may help raise platelet count',
        'Coconut water + ORS for hydration',
        'Monitor platelet count every 24-48 hours — hospitalize if < 100,000',
    ],
    'Typhoid': [
        '⚠ Requires blood/stool culture + prescribed antibiotics from a doctor',
        'Soft, easily digestible foods: khichdi, banana, boiled rice, curd',
        'Drink only boiled or bottled water — no outside food',
        'ORS for hydration throughout illness',
    ],
    'Tuberculosis': [
        '⚠ Report to nearest government hospital or DOTS center — free treatment available',
        'Never start or stop TB medication without a doctor',
        'Sputum test and chest X-ray required for diagnosis',
        'Complete 6-9 month treatment course without any gap',
    ],
    'Hepatitis': [
        '⚠ Liver function test (LFT) and specialist evaluation required',
        'Zero alcohol — absolutely contraindicated with any liver disease',
        'Complete bed rest and high-carbohydrate, low-fat diet',
        'Antiviral therapy for Hep B/C requires specialist prescription',
    ],
    'COVID-19': [
        'Paracetamol 500mg — for fever and body aches (every 6 hours)',
        'Self-isolate for minimum 7 days from symptom onset',
        'Monitor oxygen saturation with pulse oximeter daily',
        'If SpO2 falls below 94% — go to emergency immediately',
        'Stay well hydrated, rest, and ventilate your room',
    ],
    'Chickenpox': [
        'Calamine lotion — apply on blisters for itching relief',
        'Paracetamol for fever (NEVER aspirin — risk of Reye syndrome in children)',
        'Cetirizine 10mg (Antihistamine) — for severe itching',
        'Do NOT scratch blisters — causes secondary bacterial infection and scarring',
        'Isolate completely until all blisters crust over (usually 5-7 days)',
    ],
    'Arthritis': [
        'Ibuprofen 400mg or Diclofenac with food — for pain and swelling',
        'Apply warm compress or hot water bag on affected joints',
        'Gentle stretching and range-of-motion exercises daily',
        'Physiotherapy consultation recommended for long-term management',
        'See a rheumatologist for proper diagnosis (OA vs RA vs gout)',
    ],
    'Diabetes': [
        'Medication MUST be prescribed by a doctor — never self-medicate',
        'Monitor fasting and post-meal blood glucose regularly',
        'Avoid ALL refined sugar, sweets, white rice, white bread immediately',
        'Brisk walk 30 minutes after each meal — reduces blood sugar naturally',
        'HbA1c test every 3 months to track long-term sugar control',
    ],
    'Anxiety Disorder': [
        '4-7-8 breathing: Inhale 4 sec → Hold 7 sec → Exhale 8 sec — repeat 4 times',
        'Cold water splashed on face and wrists — activates calming reflex',
        'Avoid caffeine, energy drinks, and alcohol',
        'Regular physical exercise (30 min daily) is highly effective',
        'Consider counselling or CBT — consult a mental health professional',
    ],
}

DEFAULT_BASIC_MED = [
    'Paracetamol 500mg — for fever or pain (every 6 hours as needed, max 4 doses/day)',
    'Stay well hydrated — drink 8-10 glasses of water daily',
    'Complete bed rest — minimum 7-8 hours sleep per night',
    'Monitor symptoms closely — if no improvement within 3 days, consult a doctor',
    'Maintain good hygiene — frequent handwashing with soap',
]

def get_basic_medication(disease):
    for key in BASIC_MEDICATION:
        if key.lower() in disease.lower() or disease.lower() in key.lower():
            return BASIC_MEDICATION[key]
    return DEFAULT_BASIC_MED

# ─────────────────────────────────────────────────────────────────────────────
# MODEL TRAINING
# ─────────────────────────────────────────────────────────────────────────────
print("Training Random Forest Classifier...")

df_raw = pd.DataFrame(DISEASE_DATA)
symptom_cols = [c for c in df_raw.columns if 'Symptom' in c]
all_symptoms_set = set()
for col in symptom_cols:
    df_raw[col] = df_raw[col].str.strip().str.lower().str.replace(' ', '_')
    valid = df_raw[col].dropna().unique()
    all_symptoms_set.update(valid)

all_symptoms = sorted([s for s in all_symptoms_set if isinstance(s, str) and s != 'nan'])

def encode_symptoms_row(row):
    vec = {sym: 0 for sym in all_symptoms}
    for col in symptom_cols:
        val = row.get(col, None)
        if isinstance(val, str) and val in vec:
            vec[val] = 1
    return vec

encoded = df_raw.apply(encode_symptoms_row, axis=1, result_type='expand')
encoded['Disease'] = df_raw['Disease'].values

le = LabelEncoder()
encoded['Disease_Label'] = le.fit_transform(encoded['Disease'])

X = encoded[all_symptoms].values
y = encoded['Disease_Label'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

rf_model = RandomForestClassifier(
    n_estimators=200, max_depth=15, min_samples_split=2,
    min_samples_leaf=1, class_weight='balanced', random_state=42, n_jobs=-1
)
rf_model.fit(X_train, y_train)
print(f"Model trained. Diseases: {len(le.classes_)}, Symptoms: {len(all_symptoms)}")

# Spell checker
if SPELL_AVAILABLE:
    spell = SpellChecker()
    MEDICAL_VOCAB = [
        'fever','cough','nausea','vomiting','diarrhea','headache','fatigue','dizziness',
        'rash','chills','wheezing','jaundice','dyspnea','malaise','edema','tachycardia',
        'bradycardia','dysphagia','pallor','cyanosis','hemoptysis','epistaxis','syncope',
        'palpitations','polyuria','polydipsia','dengue','malaria','typhoid','tuberculosis',
        'pneumonia','influenza','asthma','diabetes','hypertension','migraine','anemia','hepatitis'
    ]
    spell.word_frequency.load_words(MEDICAL_VOCAB)

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
def correct_spelling(text):
    if not SPELL_AVAILABLE:
        return text
    words = text.lower().split()
    corrected = []
    for word in words:
        clean = re.sub(r'[^a-zA-Z]', '', word)
        if len(clean) < 3:
            corrected.append(word)
        else:
            correction = spell.correction(clean)
            if correction and correction != clean:
                corrected.append(correction)
            else:
                corrected.append(word)
    return ' '.join(corrected)

def normalize_symptom(sym):
    sym = sym.strip().lower().replace(' ', '_').replace('-', '_')
    sym = re.sub(r'_+', '_', sym)
    if sym in SYNONYM_MAP:
        return SYNONYM_MAP[sym]
    if sym in all_symptoms:
        return sym
    return None

def extract_symptoms_from_text(text):
    if not text or not text.strip():
        return []
    corrected = correct_spelling(text)
    normalized = corrected.lower()
    normalized = re.sub(r'[^a-z\s]', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    found = set()
    words = normalized.split()
    for n in [4, 3, 2, 1]:
        for i in range(len(words) - n + 1):
            phrase = '_'.join(words[i:i+n])
            mapped = normalize_symptom(phrase)
            if mapped:
                found.add(mapped)
    for word in words:
        mapped = normalize_symptom(word)
        if mapped:
            found.add(mapped)
    patterns = [
        (r'\b(fever|febrile|temperature)\b', 'fever'),
        (r'\b(cough|coughing)\b', 'cough'),
        (r'\b(headache|head\s+ache|head\s+pain)\b', 'headache'),
        (r'\b(vomit|vomiting|throwing\s+up|puking)\b', 'vomiting'),
        (r'\b(nausea|nauseous|queasy|feel\s+sick)\b', 'nausea'),
        (r'\b(diarrhea|loose\s+stool|loose\s+motion)\b', 'diarrhea'),
        (r'\b(fatigue|tired|exhausted|lethargy|weak)\b', 'fatigue'),
        (r'\b(rash|rashes|spots|itching|itchy)\b', 'rash'),
        (r'\b(sore\s+throat|throat\s+pain)\b', 'sore_throat'),
        (r'\b(chest\s+pain|chest\s+ache)\b', 'chest_pain'),
        (r'\b(stomach\s*(pain|ache)|belly\s*pain|abdominal\s*pain)\b', 'abdominal_pain'),
        (r'\b(shortness\s+of\s+breath|cant\s+breathe|difficulty\s+breathing)\b', 'shortness_of_breath'),
        (r'\b(runny\s+nose|runny)\b', 'runny_nose'),
        (r'\b(joint\s+pain|joint\s+ache)\b', 'joint_pain'),
        (r'\b(body\s+ache|muscle\s+pain|muscle\s+ache)\b', 'body_aches'),
        (r'\b(chills?|shiver|shivering)\b', 'chills'),
        (r'\b(sweating|sweat|night\s+sweat)\b', 'sweating'),
        (r'\b(dizziness?|dizzy|vertigo)\b', 'dizziness'),
        (r'\b(jaundice|yellow\s+skin|yellow\s+eye)\b', 'jaundice'),
        (r'\b(no\s+appetite|loss\s+of\s+appetite|not\s+eating)\b', 'loss_of_appetite'),
        (r'\b(weight\s+loss|losing\s+weight)\b', 'weight_loss'),
        (r'\b(frequent\s+urin|urin\s+burn|burn\s+urin)\b', 'burning_urination'),
        (r'\b(pale\s+skin|pallor|paleness)\b', 'pale_skin'),
        (r'\b(blurred?\s+vision|blurry\s+vision|vision\s+problem)\b', 'blurred_vision'),
        (r'\b(loss\s+of\s+taste|cant\s+taste|no\s+taste)\b', 'loss_of_taste'),
        (r'\b(loss\s+of\s+smell|cant\s+smell|no\s+smell)\b', 'loss_of_smell'),
        (r'\b(sneezing|sneeze)\b', 'sneezing'),
        (r'\b(wheezing|wheeze)\b', 'wheezing'),
        (r'\b(high\s+fever|very\s+high\s+fever)\b', 'high_fever'),
        (r'\b(blood\s+in\s+cough|coughing\s+blood|hemoptysis)\b', 'blood_in_cough'),
        (r'\b(anxiety|anxious|worried|tension)\b', 'excessive_worry'),
        (r'\b(palpitations?|heart\s+racing|irregular\s+heartbeat)\b', 'palpitations'),
        (r'\b(swollen?\s+lymph|lymph\s+node)\b', 'swollen_lymph'),
    ]
    for pattern, symptom in patterns:
        if re.search(pattern, normalized):
            found.add(symptom)
    return list(found)

def symptoms_to_vector(symptom_list):
    vec = np.zeros(len(all_symptoms))
    for sym in symptom_list:
        sym_clean = normalize_symptom(sym)
        if sym_clean and sym_clean in all_symptoms:
            idx = all_symptoms.index(sym_clean)
            vec[idx] = 1
    return vec

def predict_disease(symptom_list, top_n=3):
    if not symptom_list:
        return None

    norm = []
    for s in symptom_list:
        n = normalize_symptom(s)
        norm.append(n if n else s)
    norm = [s for s in norm if s]

    if len(norm) == 1:
        s = norm[0]
        display_name = s.replace('_', ' ').title()
        disease_name = f"Common {display_name}"
        return [
            {'disease': disease_name, 'confidence': 0.85, 'confidence_pct': '85.0%', 'simple_mode': True}
        ]

    if len(norm) <= 2:
        pair = frozenset(norm)

        if pair in TWO_SYMPTOM_COMMON:
            matches = TWO_SYMPTOM_COMMON[pair]
            return [
                {'disease':d,'confidence':c,'confidence_pct':f'{c:.1%}','simple_mode':True}
                for d,c in matches
            ]

        for s in norm:
            if s in SINGLE_SYMPTOM_COMMON:
                matches = SINGLE_SYMPTOM_COMMON[s]
                return [
                    {'disease':d,'confidence':c,'confidence_pct':f'{c:.1%}','simple_mode':True}
                    for d,c in matches
                ]

        for s in norm:
            for key in SINGLE_SYMPTOM_COMMON:
                if s and (s in key or key in s):
                    matches = SINGLE_SYMPTOM_COMMON[key]
                    return [
                        {'disease':d,'confidence':c,'confidence_pct':f'{c:.1%}','simple_mode':True}
                        for d,c in matches
                    ]

    vec = symptoms_to_vector(symptom_list).reshape(1, -1)
    proba = rf_model.predict_proba(vec)[0]
    top_indices = np.argsort(proba)[::-1][:top_n]
    predictions = []
    for idx in top_indices:
        disease = le.classes_[idx]
        confidence = proba[idx]
        if confidence > 0.01:
            predictions.append({
                'disease': disease,
                'confidence': float(confidence),
                'confidence_pct': f'{confidence:.1%}',
                'simple_mode': False
            })
    return predictions

def get_severity(symptom_list, disease):
    sym_set = set(symptom_list)
    if sym_set & EMERGENCY_SYMPTOMS or disease in EMERGENCY_DISEASES:
        return 3, '🔴', 'Emergency', 'Seek immediate medical care'
    moderate_count = len(sym_set & MODERATE_SYMPTOMS)
    if moderate_count >= 2 or disease in MODERATE_DISEASES:
        return 2, '🟠', 'Moderate', 'Consult a doctor soon'
    if len(symptom_list) >= 4:
        return 2, '🟠', 'Moderate', 'Monitor closely and consult if worsens'
    return 1, '🟢', 'Normal', 'Self-care with monitoring'

def get_recommendations(disease):
    if disease in RECOMMENDATIONS:
        return RECOMMENDATIONS[disease]
    for key in RECOMMENDATIONS:
        if key.lower() == disease.lower():
            return RECOMMENDATIONS[key]
    return {
        'precautions': ['Rest adequately', 'Stay hydrated', 'Consult a doctor for diagnosis'],
        'foods_to_eat': ['Balanced nutritious diet', 'Fruits and vegetables', 'Adequate water intake'],
        'foods_to_avoid': ['Alcohol', 'Processed foods', 'Excess sugar'],
        'medical_suggestions': ['Consult a qualified physician for proper diagnosis and treatment'],
        'doctor_when': 'Symptoms persist or worsen — consult a doctor',
    }

def translate_text(text, target_language='English'):
    if target_language == 'English' or not TRANSLATOR_AVAILABLE:
        return text
    target_code = LANG_TO_CODE.get(target_language, 'en')
    try:
        translator = GoogleTranslator(source='en', target=target_code)
        if len(text) > 4500:
            chunks = [text[i:i+4500] for i in range(0, len(text), 4500)]
            return ' '.join([translator.translate(c) for c in chunks])
        return translator.translate(text)
    except Exception as e:
        return text

def translate_list(lst, language):
    return [translate_text(item, language) for item in lst]

def detect_and_translate_to_english(text):
    if not TRANSLATOR_AVAILABLE or not LANGDETECT_AVAILABLE:
        return text
    try:
        detected = lang_detect(text)
        if detected != 'en':
            translator = GoogleTranslator(source=detected, target='en')
            return translator.translate(text)
        return text
    except:
        return text

# ─────────────────────────────────────────────────────────────────────────────
# MAJOR / MINOR SYMPTOM LISTS (from notebook)
# ─────────────────────────────────────────────────────────────────────────────
MAJOR_SYMPTOM_OPTIONS = [
    'fever', 'high_fever', 'prolonged_fever',
    'cough', 'dry_cough', 'persistent_cough', 'blood_in_cough',
    'shortness_of_breath', 'chest_pain', 'chest_tightness', 'wheezing',
    'headache', 'severe_headache', 'dizziness',
    'abdominal_pain', 'severe_abdominal_pain', 'nausea', 'vomiting', 'diarrhea',
    'burning_urination', 'frequent_urination', 'blood_in_urine',
    'rash', 'itchy_rash', 'blister_rash', 'jaundice',
    'joint_pain', 'body_aches', 'back_pain',
    'fatigue', 'weakness', 'weight_loss', 'chills',
    'blurred_vision',
    'sore_throat', 'loss_of_taste', 'loss_of_smell',
]

MINOR_SYMPTOM_OPTIONS = [
    'mild_fever', 'low_fever', 'sneezing', 'runny_nose', 'congestion',
    'night_sweats', 'sweating', 'loss_of_appetite', 'pale_skin',
    'muscle_pain', 'eye_pain', 'sensitivity_to_light', 'sensitivity_to_sound',
    'throbbing_pain', 'one_sided_pain', 'neck_stiffness',
    'abdominal_cramps', 'bloating', 'constipation', 'stomach_pain',
    'dark_urine', 'cloudy_urine', 'strong_odor_urine',
    'palpitations', 'irregular_heartbeat', 'rapid_breathing',
    'irritability', 'restlessness', 'difficulty_concentrating', 'sleep_disturbance',
    'skin_darkening', 'dry_skin', 'cold_hands', 'pale_nails', 'brittle_nails',
    'tingling', 'numbness', 'morning_stiffness', 'joint_swelling',
    'dehydration', 'excessive_thirst', 'frequent_hunger',
]

# ─────────────────────────────────────────────────────────────────────────────
# FLASK APP
# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok', 'diseases': len(le.classes_), 'symptoms': len(all_symptoms)})

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json() or {}

        # ── New 3-channel inputs from notebook ──────────────────────────────────
        major_syms    = data.get('major_symptoms', [])   # list of selected symptom strings
        minor_syms    = data.get('minor_symptoms', [])   # list of selected symptom strings
        description   = data.get('description', '').strip()  # free-text description
        # Legacy fallback: if only symptoms_text is sent (old frontend)
        symptoms_text = data.get('symptoms_text', '').strip()
        language      = data.get('language', 'English')
        duration_days = data.get('duration_days', None)
        gender        = (data.get('gender', '') or '').strip()

        if not major_syms and not minor_syms and not description and not symptoms_text:
            return jsonify({'error': 'No symptoms provided'}), 400

        # ── Extract from description / legacy text ────────────────────────────
        desc_syms = []
        if description:
            desc_en   = detect_and_translate_to_english(description)
            desc_syms = extract_symptoms_from_text(desc_en)
        elif symptoms_text:
            eng_text  = detect_and_translate_to_english(symptoms_text)
            desc_syms = extract_symptoms_from_text(eng_text)

        # ── Normalize major/minor symptom labels ──────────────────────────────
        def norm_list(lst):
            out = []
            for s in lst:
                n = normalize_symptom(s)
                out.append(n if n else s.strip().lower().replace(' ', '_'))
            return [x for x in out if x]

        major_norm = norm_list(major_syms)
        minor_norm = norm_list(minor_syms)
        all_syms   = list(set(major_norm + minor_norm + desc_syms))

        if not all_syms:
            return jsonify({'error': 'Could not extract symptoms. Describe your symptoms in more detail or add major/minor symptoms.'}), 400

        # ── Predict ────────────────────────────────────────────────────────────
        predictions = predict_disease(all_syms, top_n=3)
        if not predictions:
            return jsonify({'error': 'Could not make a prediction. Please add more symptoms.'}), 400

        top        = predictions[0]
        disease    = top['disease']
        confidence = top['confidence']
        is_simple  = top.get('simple_mode', False)

        sev_level, sev_emoji, sev_label, sev_desc = get_severity(all_syms, disease)
        # Duration-aware severity bump for longer-lasting complaints
        try:
            dd = int(duration_days) if duration_days is not None else None
            if dd and dd >= 7 and sev_level < 3:
                sev_level = min(3, sev_level + 1)
                if sev_level == 2:
                    sev_emoji, sev_label, sev_desc = '🟠', 'Moderate', 'Symptoms persisted over a week — consult a doctor soon'
                elif sev_level == 3:
                    sev_emoji, sev_label, sev_desc = '🔴', 'Emergency', 'Long-standing severe risk — seek medical care urgently'
        except Exception:
            pass
        recs       = get_recommendations(disease)
        basic_meds = get_basic_medication(disease) if is_simple else []

        # ── Build report ───────────────────────────────────────────────────────
        report = {
            'timestamp'        : datetime.now().strftime('%d %b %Y, %I:%M %p'),
            'major_symptoms'   : [s.replace('_', ' ').title() for s in major_norm],
            'minor_symptoms'   : [s.replace('_', ' ').title() for s in minor_norm],
            'desc_symptoms'    : [s.replace('_', ' ').title() for s in desc_syms],
            'symptoms'         : [s.replace('_', ' ').title() for s in all_syms],
            'symptom_count'    : len(all_syms),
            'simple_mode'      : is_simple,
            'disease'          : disease,
            'confidence'       : f'{confidence:.1%}',
            'confidence_raw'   : confidence,
            'severity_level'   : sev_level,
            'severity_emoji'   : sev_emoji,
            'severity_label'   : sev_label,
            'severity_desc'    : sev_desc,
            'other_predictions': [
                {'disease': p['disease'], 'confidence': p['confidence_pct']}
                for p in predictions[1:]
            ],
            'precautions'        : recs['precautions'],
            'foods_to_eat'       : recs['foods_to_eat'],
            'foods_to_avoid'     : recs['foods_to_avoid'],
            'medical_suggestions': recs['medical_suggestions'],
            'doctor_when'        : recs['doctor_when'],
            'basic_medication'   : basic_meds,
            'language'           : language,
            'duration_days'      : duration_days,
            'gender'             : gender,
        }

        # ── Translate if needed ────────────────────────────────────────────────
        if language != 'English' and TRANSLATOR_AVAILABLE:
            report['disease_translated']             = translate_text(disease, language)
            report['severity_label_translated']      = translate_text(sev_label, language)
            report['severity_desc_translated']       = translate_text(sev_desc, language)
            report['precautions_translated']         = translate_list(recs['precautions'], language)
            report['foods_to_eat_translated']        = translate_list(recs['foods_to_eat'], language)
            report['foods_to_avoid_translated']      = translate_list(recs['foods_to_avoid'], language)
            report['medical_suggestions_translated'] = translate_list(recs['medical_suggestions'], language)
            report['doctor_when_translated']         = translate_text(recs['doctor_when'], language)
            if basic_meds:
                report['basic_medication_translated'] = translate_list(basic_meds, language)

        return jsonify(report)
    except Exception as e:
        print(f"ANALYZE ERROR: {str(e)}")
        return jsonify({'error': f"Backend Analysis Error: {str(e)}"}), 500

@app.route('/api/symptoms/extract', methods=['POST'])
def extract_symptoms_api():
    data = request.get_json() or {}
    text = (data.get('text', '') or '').strip()
    language = (data.get('language', 'English') or 'English').strip()
    if not text:
        return jsonify({'symptoms': []})
    src_text = text
    if language != 'English':
        src_text = detect_and_translate_to_english(text)
    syms = extract_symptoms_from_text(src_text)
    pretty = [s.replace('_', ' ').title() for s in syms]
    return jsonify({'symptoms': pretty})

@app.route('/api/disease/summary', methods=['GET'])
def disease_summary():
    """Fetch a free Wikipedia summary for the given disease (like the notebook does)."""
    disease = request.args.get('disease', '')
    if not disease:
        return jsonify({'summary': ''}), 200
    try:
        import urllib.request
        import json as _json
        # Clean name for Wikipedia
        query = disease.replace(' ', '_')
        url = f'https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(query)}'
        req = urllib.request.Request(url, headers={'User-Agent': 'AIHealthAssistant/1.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            wiki_data = _json.loads(resp.read().decode())
            extract   = wiki_data.get('extract', '')
            thumbnail = wiki_data.get('thumbnail', {}).get('source', '')
            return jsonify({'summary': extract[:800], 'thumbnail': thumbnail})
    except Exception as e:
        return jsonify({'summary': '', 'error': str(e)}), 200

@app.route('/api/symptoms/major')
def list_major_symptoms():
    return jsonify({'symptoms': [s.replace('_', ' ').title() for s in sorted(MAJOR_SYMPTOM_OPTIONS)]})

@app.route('/api/symptoms/minor')
def list_minor_symptoms():
    return jsonify({'symptoms': [s.replace('_', ' ').title() for s in sorted(MINOR_SYMPTOM_OPTIONS)]})

@app.route('/api/tts', methods=['POST'])
def tts():
    if not TTS_AVAILABLE:
        return jsonify({'error': 'TTS not available'}), 501
    data = request.get_json()
    text = data.get('text', '')
    language = data.get('language', 'English')
    lang_code = TTS_LANG_CODE.get(language, 'en')
    try:
        tts_obj = gTTS(text=text[:1500], lang=lang_code, slow=False)
        buf = io.BytesIO()
        tts_obj.write_to_fp(buf)
        buf.seek(0)
        audio_b64 = base64.b64encode(buf.read()).decode('utf-8')
        return jsonify({'audio': audio_b64, 'format': 'mp3'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pdf', methods=['POST'])
def generate_pdf():
    if not PDF_AVAILABLE:
        return jsonify({'error': 'PDF not available'}), 501
    data = request.get_json()
    report = data.get('report', {})
    lang = report.get('language', 'English')

    disease    = report.get('disease_translated',             report.get('disease', 'Unknown'))
    sev_label  = report.get('severity_label_translated',      report.get('severity_label', ''))
    precautions= report.get('precautions_translated',         report.get('precautions', []))
    foods_eat  = report.get('foods_to_eat_translated',        report.get('foods_to_eat', []))
    foods_avoid= report.get('foods_to_avoid_translated',      report.get('foods_to_avoid', []))
    medical    = report.get('medical_suggestions_translated', report.get('medical_suggestions', []))
    doctor_when= report.get('doctor_when_translated',         report.get('doctor_when', ''))

    try:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        pdf.set_fill_color(10, 37, 64)
        pdf.rect(0, 0, 210, 35, 'F')
        pdf.set_font('Arial', 'B', 18)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(10, 8)
        pdf.cell(190, 10, '  AI Health Assistant - Medical Report', ln=True)
        pdf.set_font('Arial', '', 9)
        pdf.set_xy(10, 22)
        pdf.cell(190, 5, f'  Generated: {report.get("timestamp", "")} | Language: {lang}', ln=True)

        pdf.set_fill_color(255, 243, 205)
        pdf.rect(10, 38, 190, 10, 'F')
        pdf.set_font('Arial', 'I', 8)
        pdf.set_text_color(120, 60, 0)
        pdf.set_xy(12, 40)
        pdf.cell(186, 6, 'DISCLAIMER: For informational purposes only. Always consult a qualified physician.', ln=True)

        pdf.set_text_color(30, 30, 30)
        pdf.set_xy(10, 52)

        pdf.set_fill_color(230, 247, 255)
        pdf.rect(10, 52, 190, 34, 'F')
        pdf.set_font('Arial', 'B', 14)
        pdf.set_text_color(10, 37, 64)
        pdf.set_xy(14, 55)
        pdf.cell(0, 8, f'Primary Diagnosis: {disease}', ln=True)
        pdf.set_font('Arial', '', 10)
        pdf.set_xy(14, 64)
        pdf.cell(0, 6, f'Confidence: {report.get("confidence", "")}   |   Severity: {sev_label}', ln=True)
        pdf.set_xy(14, 72)
        syms = ', '.join(report.get('symptoms', [])[:6])
        pdf.cell(0, 6, f'Symptoms: {syms}', ln=True)

        # Major and Minor
        if report.get('major_symptoms'):
            pdf.set_xy(14, 80)
            maj = ', '.join(report['major_symptoms'][:6])
            pdf.cell(0, 6, f'Major: {maj}', ln=True)

        def section(title, items, y_pad=4):
            pdf.ln(6)
            pdf.set_fill_color(10, 37, 64)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font('Arial', 'B', 11)
            pdf.cell(190, 8, f'  {title}', ln=True, fill=True)
            pdf.set_text_color(30, 30, 30)
            pdf.set_font('Arial', '', 9)
            for item in items:
                safe = item.encode('latin-1', 'replace').decode('latin-1')
                pdf.cell(10, y_pad, '', ln=False)
                pdf.cell(0, y_pad + 2, f'* {safe}', ln=True)

        section('Precautions', precautions)
        section('Recommended Foods', foods_eat)
        section('Foods to Avoid', foods_avoid)
        section('Medical Suggestions', medical)

        pdf.ln(6)
        pdf.set_fill_color(200, 30, 30)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(190, 8, '  When to See a Doctor', ln=True, fill=True)
        pdf.set_text_color(180, 0, 0)
        pdf.set_font('Arial', 'BI', 9)
        safe_doc = doctor_when.encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(190, 6, f'  {safe_doc}')

        pdf.set_y(-20)
        pdf.set_fill_color(10, 37, 64)
        pdf.rect(0, pdf.get_y(), 210, 20, 'F')
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('Arial', 'I', 8)
        pdf.cell(0, 8, 'AI Health Assistant | For informational purposes only | Consult a doctor for medical advice', align='C')

        pdf_str = pdf.output(dest='S')
        pdf_bytes = pdf_str.encode('latin-1') if isinstance(pdf_str, str) else bytes(pdf_str)

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'health_report_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/symptoms/list')
def list_symptoms():
    return jsonify({'symptoms': [s.replace('_', ' ').title() for s in all_symptoms]})

import urllib.parse

if __name__ == '__main__':
    print("AI Health Assistant Backend starting...")
    print(f"Model trained: {len(le.classes_)} diseases, {len(all_symptoms)} symptoms")
    print("Open: http://localhost:5000")
    app.run(debug=False, host='0.0.0.0', port=5000)
