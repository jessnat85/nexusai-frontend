import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  View, Text, Image, StyleSheet, ScrollView,
  useColorScheme, TouchableOpacity, TextInput, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {
  const [image, setImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  // State for clarify/follow-up AI Q&A per result index
  const [clarifyQuestion, setClarifyQuestion] = useState({});
  const [clarifyResponse, setClarifyResponse] = useState({});
  const [clarifyLoading, setClarifyLoading] = useState({});
  // State for predefined question dropdowns
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [selectedResultQuestions, setSelectedResultQuestions] = useState({});
  // Ask AI follow-up for a specific trade result
  const askAIClarify = async (question, res, index) => {
    if (!question || question.trim().length === 0) return;
    setClarifyLoading(prev => ({ ...prev, [index]: true }));
    setClarifyResponse(prev => ({ ...prev, [index]: null }));
    try {
      // Compose payload with trade context and question
      const payload = {
        userId: 'jessnat',
        trade: res,
        question,
      };
      const response = await fetch('https://nexus-ai-backend-1.onrender.com/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Non-200 response');
      }
      const data = await response.json();
      setClarifyResponse(prev => ({ ...prev, [index]: data.response || 'No response from AI.' }));
    } catch (err) {
      setClarifyResponse(prev => ({ ...prev, [index]: '❌ Failed to get response from AI.' }));
    }
    setClarifyLoading(prev => ({ ...prev, [index]: false }));
  };
  const [expanded, setExpanded] = useState({});
  const [portfolio, setPortfolio] = useState('');
  const [risk, setRisk] = useState('moderate');
  const [assetType, setAssetType] = useState('Forex');
  const [language, setLanguage] = useState('English');
  const [tradeStyle, setTradeStyle] = useState('Intraday');
  const [savedIds, setSavedIds] = useState([]);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const themeStyles = isDark ? styles.dark : styles.light;

  // Helper to bold timeframe words in commentary
  const highlightTimeframes = (text) => {
    if (!text) return null;
    const parts = text.split(/(1m|2m|3m|5m|15m|30m|1h|4h|Daily)/i);
    return parts.map((part, index) =>
      /^(1m|2m|3m|5m|15m|30m|1h|4h|Daily)$/i.test(part) ? (
        <Text key={index} style={{ fontWeight: 'bold' }}>{part}</Text>
      ) : (
        <Text key={index}>{part}</Text>
      )
    );
  };

  // Pick image from gallery
  const pickImage = async () => {
    setAnalysis(null);
    setLoading(false);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeChart(result.assets[0].uri);
    }
  };

  // Take a picture with the camera
  const takePhoto = async () => {
    setAnalysis(null);
    setLoading(false);
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeChart(result.assets[0].uri);
    }
  };

  // Show image selection options
  const handleImageSelection = async () => {
    // Show action sheet with options: "Take Photo", "Choose from Gallery", "Cancel"
    // For simplicity, use prompt if ActionSheet is not available (expo does not provide native ActionSheet by default)
    // You can replace this with a better UI (e.g. react-native-action-sheet) if desired
    const options = ['Take Photo', 'Choose from Gallery', 'Cancel'];
    // Use window.prompt as a quick workaround for demo, can be replaced with a modal
    // 0: Take Photo, 1: Choose from Gallery
    // On native, consider using a library for action sheets
    let choice = null;
    if (typeof window !== 'undefined' && window.prompt) {
      const input = window.prompt('Select option:\n1. Take Photo\n2. Choose from Gallery\n(Cancel to abort)');
      if (input === '1') choice = 0;
      else if (input === '2') choice = 1;
    } else {
      // Fallback: just pick from gallery (for native, replace with ActionSheet)
      choice = await new Promise(resolve => {
        // Use setTimeout to avoid blocking
        setTimeout(() => resolve(1), 0);
      });
    }
    if (choice === 0) {
      await takePhoto();
    } else if (choice === 1) {
      await pickImage();
    }
    // else: cancel/do nothing
  };

  const analyzeChart = async (uri) => {
    setLoading(true);
    setAnalysis(null);
    const formData = new FormData();

    formData.append('file', {
      uri: uri,
      name: 'chart.png',
      type: 'image/png',
    });
    formData.append('portfolioSize', portfolio || '10000');
    formData.append('riskTolerance', risk);
    formData.append('assetType', assetType);
    formData.append('language', language || 'English');
    formData.append('userId', 'jessnat');
    formData.append('tradeStyle', tradeStyle);

    try {
      const response = await fetch("https://nexus-ai-backend-1.onrender.com/analyze", {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error('Non-200 response');
      }

      const data = await response.json();
      setAnalysis(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Analyze failed:', error);
      alert("❌ Failed to connect to backend or invalid data. Check logs.");
    }
    setLoading(false);
  };

  const formatRR = (entry, stop, target) => {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    if (!risk || risk === 0) return 'N/A';
    return (reward / risk).toFixed(2);
  };

  const toggleExpand = (index) => {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // TODO: Replace alert() with a proper styled popup or toast animation in a future commit.
  // Save trade to history function, tracks saved entries
  const saveTradeToHistory = async (trade) => {
    try {
      const response = await fetch("https://nexus-ai-backend-1.onrender.com/save-trade", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'jessnat', trade }),
      });
      const result = await response.json();
      setSavedIds((prev) => [...prev, trade.entry]); // Assumes entry is unique
    } catch (err) {
      console.error("Save trade failed:", err);
      alert("❌ Failed to save trade.");
    }
  };

  return (
    <ScrollView style={[styles.container, themeStyles.background]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[styles.title, themeStyles.text]}>NEXUS AI</Text>

      <View style={styles.settingsBox}>
        <View style={styles.portfolioInputContainer}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.inputWithDollar}
            placeholder="Portfolio Size"
            keyboardType="numeric"
            value={portfolio}
            onChangeText={setPortfolio}
          />
        </View>

        <View style={styles.riskButtons}>
          {['low', 'moderate', 'high'].map(level => (
            <TouchableOpacity
              key={level}
              style={[styles.riskBtn, risk === level && styles.riskBtnActive]}
              onPress={() => setRisk(level)}
            >
              <Text style={styles.riskBtnText}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.assetTypeBox}>
          <Text style={styles.label}>Asset Type:</Text>
          <View style={styles.assetTypeOptions}>
            {['Forex', 'Crypto', 'Gold', 'Stocks', 'Indices'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.assetTypeBtn, assetType === type && styles.assetTypeBtnActive]}
                onPress={() => setAssetType(type)}
              >
                <Text style={styles.assetTypeBtnText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.assetTypeBox}>
          <Text style={styles.label}>Language:</Text>
          <View style={styles.assetTypeOptions}>
            {['English', 'French', 'Spanish'].map(lang => (
              <TouchableOpacity
                key={lang}
                style={[styles.assetTypeBtn, language === lang && styles.assetTypeBtnActive]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={styles.assetTypeBtnText}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.assetTypeBox}>
          <Text style={styles.label}>Trade Style:</Text>
          <View style={styles.assetTypeOptions}>
            {['Scalp', 'Intraday', 'Swing'].map(style => (
              <TouchableOpacity
                key={style}
                style={[styles.assetTypeBtn, tradeStyle === style && styles.assetTypeBtnActive]}
                onPress={() => setTradeStyle(style)}
              >
                <Text style={styles.assetTypeBtnText}>{style}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.uploadBtn} onPress={handleImageSelection}>
        <AntDesign name="upload" size={20} color="white" />
        <Text style={styles.uploadText}>Upload Chart</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.chartImage} />}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={[styles.loading, themeStyles.text]}>Analyzing chart</Text>
        </View>
      )}

      {!loading && analysis?.results?.length === 0 && (
        <Text style={[styles.noSetupText, themeStyles.text]}>No trade setup detected for this chart.</Text>
      )}

      {analysis?.conflictCommentary && (
        <View style={styles.conflictBox}>
          <Feather name="alert-triangle" size={16} color="orange" style={{ marginRight: 6 }} />
          <Text style={styles.conflictText}>{analysis.conflictCommentary}</Text>
        </View>
      )}

      {analysis?.topPick && (
        <>
          <View style={[styles.topPickBox, styles.strategyBlock]}>
            {/* --- Trade Type and Strategy Badges --- */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ backgroundColor: '#D4AF37', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{analysis.topPick.tradeType}</Text>
              </View>
              <View style={{ backgroundColor: '#232323', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 12 }}>{analysis.topPick.strategy}</Text>
              </View>
              {/* Remove old Nexus Confluence badge here if any */}
            </View>
            <Text style={styles.topPickLabel}>Top Pick</Text>
            <Text style={styles.strategyTitle}>{analysis.topPick.strategy}</Text>
            {/* --- NEXUS CONFLUENCE TRADE badge inside Top Pick card if superTrade --- */}
            {analysis.superTrade && (
              <View style={styles.confluenceBadge}>
                <Text style={styles.confluenceText}>NEXUS CONFLUENCE TRADE</Text>
              </View>
            )}
            {/* --- Confidence Bar --- */}
            <View style={{ marginTop: 8, marginBottom: 10 }}>
              <View style={{
                height: 12,
                backgroundColor: '#eee',
                borderRadius: 6,
                overflow: 'hidden',
                width: '100%',
              }}>
                <View
                  style={{
                    height: 12,
                    width: `${Math.min(analysis.topPick.confidence, 100)}%`,
                    backgroundColor: analysis.topPick.confidence >= 75 ? '#D4AF37' : '#bbb',
                  }}
                />
              </View>
              <Text style={{
                alignSelf: 'flex-end',
                fontSize: 12,
                fontWeight: 'bold',
                color: analysis.topPick.confidence >= 75 ? '#D4AF37' : '#333',
                marginTop: 2,
              }}>
                {analysis.topPick.confidence}% Confidence
              </Text>
            </View>
            <Text style={styles.label}>
              Signal: <Text style={{ color: analysis.topPick.signal === 'Buy' ? 'darkgreen' : 'darkred' }}>{analysis.topPick.signal}</Text>
            </Text>
            <Text style={styles.label}>Bias: {analysis.topPick.bias}</Text>
            <Text style={styles.label}>Trade Type: {analysis.topPick.tradeType}</Text>
            <Text style={styles.label}>Pattern: {analysis.topPick.pattern}</Text>
            {/* --- Entry, SL, TP Levels --- */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 4 }}>
              <View style={{ marginRight: 16 }}>
                <Text style={[styles.label, { color: '#D4AF37', marginBottom: 0 }]}>Entry</Text>
                <Text>{analysis.topPick.entry}</Text>
              </View>
              <View style={{ marginRight: 16 }}>
                <Text style={[styles.label, { color: '#e53935', marginBottom: 0 }]}>SL</Text>
                <Text>{analysis.topPick.stopLoss}</Text>
              </View>
              <View style={{ marginRight: 16 }}>
                <Text style={[styles.label, { color: '#388e3c', marginBottom: 0 }]}>TP1</Text>
                <Text>{analysis.topPick.takeProfit}</Text>
              </View>
              {analysis.topPick.takeProfit2 && (
                <View style={{ marginRight: 16 }}>
                  <Text style={[styles.label, { color: '#1976d2', marginBottom: 0 }]}>TP2</Text>
                  <Text>{analysis.topPick.takeProfit2}</Text>
                </View>
              )}
            </View>
            <Text style={styles.label}>
              RR: {formatRR(analysis.topPick.entry, analysis.topPick.stopLoss, analysis.topPick.takeProfit)}
            </Text>
            <Text style={styles.label}>Size: {analysis.topPick.recommendedSize}</Text>
            {/* --- Confidence Tag --- */}
            {analysis.topPick.confidence >= 75 ? (
              <View style={styles.highConfidenceTag}>
                <Text style={styles.highConfidenceText}>{analysis.topPick.confidence}% High Confidence</Text>
              </View>
            ) : (
              <View style={styles.confidenceTag}>
                <Text style={styles.confidenceText}>{analysis.topPick.confidence}% Confidence</Text>
              </View>
            )}
            {/* --- Commentary Section --- */}
            <View style={styles.commentaryBox}>
              <MaterialCommunityIcons name="lightbulb-outline" size={16} color={isDark ? '#fff' : '#333'} />
              <Text style={styles.commentary}>{highlightTimeframes(analysis.topPick.commentary)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginTop: 8 }}>
              {savedIds.includes(analysis.topPick.entry) ? (
                <Text style={{ fontStyle: 'italic', color: '#444' }}>✓ Saved</Text>
              ) : (
                <TouchableOpacity
                  style={styles.saveBtnCompact}
                  onPress={() => saveTradeToHistory(analysis.topPick)}
                >
                  <Feather name="save" size={14} color="white" />
                  <Text style={styles.saveBtnTextCompact}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* --- Clarify/Ask AI follow-up section for Top Pick (index: -1) --- */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Ask AI a follow-up about this trade:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#D4AF37',
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: isDark ? '#222' : '#fff',
                    color: isDark ? '#fff' : '#000',
                    marginRight: 8,
                  }}
                  placeholder="Type your question..."
                  placeholderTextColor={isDark ? '#aaa' : '#888'}
                  value={clarifyQuestion[-1] || ''}
                  onChangeText={text =>
                    setClarifyQuestion(prev => ({ ...prev, [-1]: text }))
                  }
                  editable={!clarifyLoading[-1]}
                />
                {/* Microphone Button Placeholder */}
                <TouchableOpacity
                  style={{
                    marginRight: 8,
                    backgroundColor: '#eee',
                    padding: 8,
                    borderRadius: 50,
                  }}
                  onPress={() => {
                    // Placeholder for voice input logic
                    alert('Voice input coming soon!');
                  }}
                >
                  <Feather name="mic" size={18} color="#D4AF37" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#000',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: clarifyLoading[-1] ? 0.6 : 1,
                  }}
                  onPress={() => askAIClarify((clarifyQuestion[-1] || '').trim(), analysis.topPick, -1)}
                  disabled={clarifyLoading[-1] || !(clarifyQuestion[-1] && clarifyQuestion[-1].trim())}
                >
                  <Feather name="message-circle" size={16} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 4, fontWeight: 'bold' }}>Ask AI</Text>
                </TouchableOpacity>
              </View>
              {/* Predefined question dropdown */}
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10, marginTop: 8 }}>
                <Picker
                  selectedValue={selectedQuestion}
                  onValueChange={(itemValue) => {
                    setSelectedQuestion(itemValue);
                    if (itemValue) setClarifyQuestion(prev => ({ ...prev, [-1]: itemValue }));
                  }}
                >
                  <Picker.Item label="Select a question..." value="" />
                  <Picker.Item label="What strategy is used?" value="What strategy is used?" />
                  <Picker.Item label="What is the reasoning behind this trade?" value="What is the reasoning behind this trade?" />
                  <Picker.Item label="Is there a risk of reversal?" value="Is there a risk of reversal?" />
                  <Picker.Item label="What confirmation should I wait for?" value="What confirmation should I wait for?" />
                </Picker>
              </View>
              {clarifyLoading[-1] && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <ActivityIndicator size="small" color="#D4AF37" />
                  <Text style={{ marginLeft: 8, color: isDark ? '#fff' : '#000' }}>AI is thinking...</Text>
                </View>
              )}
              {clarifyResponse[-1] && !clarifyLoading[-1] && (
                <View style={{ marginTop: 8, backgroundColor: isDark ? '#232323' : '#fff8dc', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: isDark ? '#fff' : '#000' }}>{clarifyResponse[-1]}</Text>
                  {/* Like button below the AI response */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 10,
                      alignSelf: 'flex-start',
                    }}
                    onPress={() => {
                      // Log feedback or send to backend in the future
                      console.log('👍 Liked top pick AI response!');
                      alert('Thank you for your feedback!');
                    }}
                  >
                    <AntDesign name="like1" size={18} color="#D4AF37" />
                    <Text style={{ marginLeft: 5, color: '#D4AF37', fontWeight: 'bold' }}>Like</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {/* --- End Clarify/Ask AI section for Top Pick --- */}
          </View>
        </>
      )}

      {analysis?.results?.length > 0 && (
        <View style={styles.result}>
          {/* Nexus Confluence Trade badge removed from here */}
          {analysis.results.map((res, index) => (
            <View key={index} style={styles.strategyBlock}>
              <View style={styles.strategyTitleRow}>
                <Feather name="activity" size={16} color={isDark ? '#fff' : '#000'} style={{ marginRight: 4 }} />
                <Text style={styles.strategyTitle}>{res.strategy}</Text>
              </View>
              <Text><Text style={styles.label}>Signal:</Text> <Text style={{ color: res.signal === 'Buy' ? 'darkgreen' : 'darkred' }}>{res.signal}</Text></Text>
              <Text><Text style={styles.label}>Bias:</Text> {res.bias}</Text>
              <Text><Text style={styles.label}>Trade Type:</Text> {res.tradeType}</Text>
              <Text><Text style={styles.label}>Pattern:</Text> {res.pattern}</Text>
              <Text>
                <Text style={styles.label}>Entry:</Text> {res.entry} | <Text style={styles.label}>SL:</Text> {res.stopLoss} | <Text style={styles.label}>TP1:</Text> {res.takeProfit}
                {res.takeProfit2 && (<Text> | <Text style={styles.label}>TP2:</Text> {res.takeProfit2}</Text>)}
              </Text>
              <Text><Text style={styles.label}>RR:</Text> {formatRR(res.entry, res.stopLoss, res.takeProfit)}</Text>
              <Text><Text style={styles.label}>Size:</Text> {res.recommendedSize}</Text>
              {res.confidence >= 75 ? (
                <View style={styles.highConfidenceTag}>
                  <Text style={styles.highConfidenceText}>{res.confidence}% High Confidence</Text>
                </View>
              ) : (
                <View style={styles.confidenceTag}>
                  <Text style={styles.confidenceText}>{res.confidence}% Confidence</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => toggleExpand(index)}>
                <Text style={{ color: '#000', textDecorationLine: 'underline', marginBottom: 6 }}>
                  {expanded[index] ? '▲ Less' : '▼ More'}
                </Text>
              </TouchableOpacity>
              {expanded[index] && (
                <>
                  <View style={styles.commentaryBox}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color={isDark ? '#fff' : '#333'} />
                    <Text style={styles.commentary}>{highlightTimeframes(res.commentary)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginTop: 8 }}>
                    {savedIds.includes(res.entry) ? (
                      <Text style={{ fontStyle: 'italic', color: '#444' }}>✓ Saved</Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.saveBtnCompact}
                        onPress={() => saveTradeToHistory(res)}
                      >
                        <Feather name="save" size={14} color="white" />
                        <Text style={styles.saveBtnTextCompact}>Save</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
              {/* --- Clarify/Ask AI follow-up section --- */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Ask AI a follow-up about this trade:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#D4AF37',
                      borderRadius: 8,
                      padding: 8,
                      backgroundColor: isDark ? '#222' : '#fff',
                      color: isDark ? '#fff' : '#000',
                      marginRight: 8,
                    }}
                    placeholder="Type your question..."
                    placeholderTextColor={isDark ? '#aaa' : '#888'}
                    value={clarifyQuestion[index] || ''}
                    onChangeText={text =>
                      setClarifyQuestion(prev => ({ ...prev, [index]: text }))
                    }
                    editable={!clarifyLoading[index]}
                  />
                  {/* Microphone Button Placeholder */}
                  <TouchableOpacity
                    style={{
                      marginRight: 8,
                      backgroundColor: '#eee',
                      padding: 8,
                      borderRadius: 50,
                    }}
                    onPress={() => {
                      // Placeholder for voice input logic
                      alert('Voice input coming soon!');
                    }}
                  >
                    <Feather name="mic" size={18} color="#D4AF37" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#000',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      opacity: clarifyLoading[index] ? 0.6 : 1,
                    }}
                    onPress={() => askAIClarify((clarifyQuestion[index] || '').trim(), res, index)}
                    disabled={clarifyLoading[index] || !(clarifyQuestion[index] && clarifyQuestion[index].trim())}
                  >
                    <Feather name="message-circle" size={16} color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 4, fontWeight: 'bold' }}>Ask AI</Text>
                  </TouchableOpacity>
                </View>
                {/* Predefined question dropdown */}
                <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10, marginTop: 8 }}>
                  <Picker
                    selectedValue={selectedResultQuestions[index] || ''}
                    onValueChange={(itemValue) => {
                      setSelectedResultQuestions(prev => ({ ...prev, [index]: itemValue }));
                      if (itemValue) setClarifyQuestion(prev => ({ ...prev, [index]: itemValue }));
                    }}
                  >
                    <Picker.Item label="Select a question..." value="" />
                    <Picker.Item label="What strategy is used?" value="What strategy is used?" />
                    <Picker.Item label="What is the reasoning behind this trade?" value="What is the reasoning behind this trade?" />
                    <Picker.Item label="Is there a risk of reversal?" value="Is there a risk of reversal?" />
                    <Picker.Item label="What confirmation should I wait for?" value="What confirmation should I wait for?" />
                  </Picker>
                </View>
                {clarifyLoading[index] && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <ActivityIndicator size="small" color="#D4AF37" />
                    <Text style={{ marginLeft: 8, color: isDark ? '#fff' : '#000' }}>AI is thinking...</Text>
                  </View>
                )}
                {clarifyResponse[index] && !clarifyLoading[index] && (
                  <View style={{ marginTop: 8, backgroundColor: isDark ? '#232323' : '#fff8dc', padding: 10, borderRadius: 8 }}>
                    <Text style={{ color: isDark ? '#fff' : '#000' }}>{clarifyResponse[index]}</Text>
                    {/* Like button below the AI response */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 10,
                        alignSelf: 'flex-start',
                      }}
                      onPress={() => {
                        // Log feedback or send to backend in the future
                        console.log(`👍 Liked AI response for trade index ${index}!`);
                        alert('Thank you for your feedback!');
                      }}
                    >
                      <AntDesign name="like1" size={18} color="#D4AF37" />
                      <Text style={{ marginLeft: 5, color: '#D4AF37', fontWeight: 'bold' }}>Like</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {/* --- End Clarify/Ask AI section --- */}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'HelveticaNeue',
  },
  settingsBox: {
    marginBottom: 20,
  },
  portfolioInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
    color: '#D4AF37',
  },
  inputWithDollar: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  riskButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  riskBtn: {
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  riskBtnActive: {
    backgroundColor: '#D4AF37',
  },
  riskBtnText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  assetTypeBox: {
    marginTop: 10,
  },
  assetTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  assetTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ddd',
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  assetTypeBtnActive: {
    backgroundColor: '#D4AF37',
  },
  assetTypeBtnText: {
    color: '#000',
    fontWeight: 'bold',
  },
  uploadBtn: {
    flexDirection: 'row',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  uploadText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'HelveticaNeue-Medium',
  },
  chartImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  loading: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 16,
    marginTop: 8,
  },
  noSetupText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
  topPickBox: {
    backgroundColor: '#fff8dc',
    borderColor: '#D4AF37',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  strategyBlock: {
    backgroundColor: '#f4f4f4',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  strategyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  strategyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceTag: {
    backgroundColor: '#D4AF37',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  confidenceText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  highConfidenceTag: {
    backgroundColor: '#000',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  highConfidenceText: {
    color: '#D4AF37',
    fontWeight: 'bold',
  },
  commentary: {
    fontSize: 14,
    marginTop: 6,
  },
  commentaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  superTradeBox: {
    backgroundColor: '#e6e6e6',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  superTradeText: {
    color: '#D4AF37',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  confluenceBadge: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
  },
  confluenceText: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 12,
  },
  light: {
    background: { backgroundColor: '#fff' },
    text: { color: '#000' },
  },
  dark: {
    background: { backgroundColor: '#121212' },
    text: { color: '#fff' },
  },
  conflictBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffa500',
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  conflictText: {
    color: '#8a6d3b',
    fontSize: 14,
    flex: 1,
    fontStyle: 'italic',
  },
  saveBtnCompact: {
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  saveBtnTextCompact: {
    color: 'white',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
});

