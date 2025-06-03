import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { Modal, FlatList } from 'react-native';
import {
  View, Text, Image, StyleSheet, ScrollView,
  useColorScheme, TouchableOpacity, TextInput, ActivityIndicator,
  Platform, ActionSheetIOS, Alert
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
  const [selectedPredefined, setSelectedPredefined] = useState('');
  const [selectedResultQuestions, setSelectedResultQuestions] = useState({});
  // Modal state for custom picker
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTarget, setModalTarget] = useState(null); // -1 for topPick, or result index
  // Predefined follow-up questions for Picker dropdowns
  const predefinedQuestions = [
    "Why is this trade valid?",
    "What is the confidence based on?",
    "Can I use this setup for scalping?",
    "What does the price structure tell us?",
    "Which indicator confirmed the trade?"
  ];
  // Handler for opening the modal picker
  const openModalPicker = (targetIndex) => {
    setModalTarget(targetIndex);
    setModalVisible(true);
  };
  // Handler for selecting a question from modal
  const handleModalSelect = (question, targetIndex) => {
    setModalVisible(false);
    if (targetIndex === -1) {
      setSelectedPredefined(question);
      setClarifyQuestion(prev => ({ ...prev, [-1]: question }));
    } else {
      setSelectedResultQuestions(prev => ({ ...prev, [targetIndex]: question }));
      setClarifyQuestion(prev => ({ ...prev, [targetIndex]: question }));
    }
  };
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
  // These are now controlled via Settings screen only.
  const [portfolio, setPortfolio] = useState('');
  const [risk, setRisk] = useState('moderate');
  const [assetType, setAssetType] = useState('Forex');
  const [language, setLanguage] = useState('English');
  const [tradeStyle, setTradeStyle] = useState('Intraday');
  const [savedIds, setSavedIds] = useState([]);
  const [timeframe, setTimeframe] = useState("5m");
  // Chart timeframe picker state for chart view
  const [chartTime, setChartTime] = useState('15m');
  // Inline dropdown state for asset type
  const [showAssetTypeDropdown, setShowAssetTypeDropdown] = useState(false);
  // Inline dropdown state for chart timeframe
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
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
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickImage();
          }
        }
      );
    } else {
      // Simple fallback for Android or other platforms
      Alert.alert(
        'Select Option',
        'Choose image source',
        [
          { text: 'Take Photo', onPress: () => takePhoto() },
          { text: 'Choose from Gallery', onPress: () => pickImage() },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
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
    formData.append('timeframe', timeframe);

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

  // Dropdown options for timeframe and asset type
  const timeframeOptions = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];
  const assetTypeOptions = ["Forex", "Crypto", "Gold", "Stocks", "Indices", "Commodities", "Futures"];

  return (
    <ScrollView style={[styles.container, themeStyles.background]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[styles.title, themeStyles.text]}>NEXUS AI</Text>

      {/* Chart Timeframe Picker (inline dropdown) */}
      <Text style={styles.dropdownLabel}>Chart Timeframe</Text>
      <View>
        <TouchableOpacity
          onPress={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
          style={styles.dropdownWrapper}
        >
          <Text style={styles.dropdownText}>{timeframe}</Text>
          <Feather name="chevron-down" size={18} color="#D4AF37" />
        </TouchableOpacity>
        {/* Timeframe Dropdown */}
        {showTimeframeDropdown && (
          <View style={styles.dropdownList}>
            {timeframeOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setTimeframe(opt);
                  setShowTimeframeDropdown(false);
                }}
                style={[
                  styles.dropdownOption,
                  timeframe === opt && styles.dropdownOptionSelected
                ]}
              >
                <Text style={timeframe === opt ? styles.dropdownTextSelected : styles.dropdownOptionText}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Asset Type Selector Inline Dropdown */}
      <Text style={styles.dropdownLabel}>Asset Type</Text>
      <View>
        <TouchableOpacity
          onPress={() => setShowAssetTypeDropdown(!showAssetTypeDropdown)}
          style={styles.dropdownWrapper}
        >
          <Text style={styles.dropdownText}>{assetType}</Text>
          <Feather name="chevron-down" size={18} color="#D4AF37" />
        </TouchableOpacity>
        {/* Asset Type Dropdown */}
        {showAssetTypeDropdown && (
          <View style={styles.dropdownList}>
            {assetTypeOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setAssetType(opt);
                  setShowAssetTypeDropdown(false);
                }}
                style={[
                  styles.dropdownOption,
                  assetType === opt && styles.dropdownOptionSelected
                ]}
              >
                <Text style={assetType === opt ? styles.dropdownTextSelected : styles.dropdownOptionText}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity style={[styles.uploadBtn, { marginTop: 12, alignSelf: 'center' }]} onPress={handleImageSelection}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Feather name="star" size={18} color="#D4AF37" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#000' }}>Top Pick</Text>
            </View>
            <View style={styles.strategyTitleRow}>
              <Feather name="activity" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.strategyTitle}>{analysis.topPick.strategy}</Text>
            </View>
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
            <Text style={[styles.label, { fontWeight: '600' }]}>
              Signal: <Text style={{ fontWeight: 'normal', color: analysis.topPick.signal === 'Buy' ? 'darkgreen' : 'darkred' }}>{analysis.topPick.signal}</Text>
            </Text>
            <Text style={[styles.label, { fontWeight: '600' }]}>
              Bias: <Text style={{ fontWeight: 'normal' }}>{analysis.topPick.bias}</Text>
            </Text>
            <Text style={[styles.label, { fontWeight: '600' }]}>
              Trade Type: <Text style={{ fontWeight: 'normal' }}>{analysis.topPick.tradeType}</Text>
            </Text>
            <Text style={[styles.label, { fontWeight: '600' }]}>
              Pattern: <Text style={{ fontWeight: 'normal' }}>{analysis.topPick.pattern}</Text>
            </Text>
            {/* --- Entry, SL, TP Levels --- */}
            <Text style={styles.label}>
              <Text style={{ fontWeight: '700' }}>Entry:</Text>
              <Text style={{ fontWeight: 'normal' }}> {analysis.topPick.entry}</Text>
              {" | "}
              <Text style={{ fontWeight: '700' }}>SL:</Text>
              <Text style={{ fontWeight: 'normal' }}> {analysis.topPick.stopLoss}</Text>
              {" | "}
              <Text style={{ fontWeight: '700' }}>TP1:</Text>
              <Text style={{ fontWeight: 'normal' }}> {analysis.topPick.takeProfit}</Text>
              {analysis.topPick.takeProfit2 ? (
                <>
                  {" | "}
                  <Text style={{ fontWeight: '700' }}>TP2:</Text>
                  <Text style={{ fontWeight: 'normal' }}> {analysis.topPick.takeProfit2}</Text>
                </>
              ) : null}
            </Text>
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
              <Text style={[styles.commentary, { flexWrap: 'wrap', flex: 1 }]}>{highlightTimeframes(analysis.topPick.commentary)}</Text>
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
              <View style={styles.predefinedDropdownWrapper}>
                <TouchableOpacity
                  style={[
                    styles.predefinedDropdown,
                    { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#232323' : '#fff' }
                  ]}
                  onPress={() => openModalPicker(-1)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: (selectedPredefined ? (isDark ? '#fff' : '#000') : '#888'), flex: 1 }}>
                    {selectedPredefined ? selectedPredefined : 'Select a predefined question...'}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#D4AF37" />
                </TouchableOpacity>
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
            <View key={index} style={styles.strategyBox}>
              <View style={styles.strategyTitleRow}>
                <Feather name="activity" size={16} color={isDark ? '#fff' : '#000'} style={{ marginRight: 4 }} />
                <Text style={[styles.strategyTitle, { fontSize: 15, fontWeight: '600' }]}>{res.strategy}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#D4AF37', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{res.tradeType}</Text>
                </View>
                <View style={{ backgroundColor: '#232323', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 12 }}>{res.strategy}</Text>
                </View>
              </View>
              <View style={{ marginBottom: 6 }}>
                <Text style={[styles.label, { fontSize: 15, fontWeight: '600' }]}>
                  Signal: <Text style={{ color: res.signal === 'Buy' ? 'darkgreen' : 'darkred', fontWeight: 'normal' }}>{res.signal}</Text> | 
                  Bias: <Text style={{ fontWeight: 'normal' }}>{res.bias}</Text>
                </Text>
              </View>
              <Text style={[styles.label, { fontSize: 15, fontWeight: '600', marginBottom: 6 }]}>
                Pattern: <Text style={{ fontWeight: 'normal' }}>{res.pattern}</Text>
              </Text>
              {/* Entry, SL, TP Levels */}
              <Text style={styles.label}>
                <Text style={{ fontWeight: '700' }}>Entry:</Text>
                <Text style={{ fontWeight: 'normal' }}> {res.entry}</Text>
                {" | "}
                <Text style={{ fontWeight: '700' }}>SL:</Text>
                <Text style={{ fontWeight: 'normal' }}> {res.stopLoss}</Text>
                {" | "}
                <Text style={{ fontWeight: '700' }}>TP1:</Text>
                <Text style={{ fontWeight: 'normal' }}> {res.takeProfit}</Text>
                {res.takeProfit2 ? (
                  <>
                    {" | "}
                    <Text style={{ fontWeight: '700' }}>TP2:</Text>
                    <Text style={{ fontWeight: 'normal' }}> {res.takeProfit2}</Text>
                  </>
                ) : null}
              </Text>
              <Text style={[styles.label, { fontSize: 15 }]}>
                RR: <Text style={{ fontWeight: 'normal', color: '#333' }}>{formatRR(res.entry, res.stopLoss, res.takeProfit)}</Text>
              </Text>
              <Text style={[styles.label, { fontSize: 15 }]}>
                Size: <Text style={{ fontWeight: 'normal', color: '#333' }}>{res.recommendedSize}</Text>
              </Text>
              {/* Confidence badge (match Top Pick style) */}
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
                    <Text style={[styles.commentary, { flexWrap: 'wrap', flex: 1 }]}>{highlightTimeframes(res.commentary)}</Text>
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
                {/* Predefined question dropdown as a dropdown */}
                <View style={styles.predefinedDropdownWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.predefinedDropdown,
                      { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#232323' : '#fff' }
                    ]}
                    onPress={() => openModalPicker(index)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: (selectedResultQuestions[index] ? (isDark ? '#fff' : '#000') : '#888'), flex: 1 }}>
                      {selectedResultQuestions[index]
                        ? selectedResultQuestions[index]
                        : 'Select a predefined question...'}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#D4AF37" />
                  </TouchableOpacity>
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
      {/* Modal Picker for Predefined Questions */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: isDark ? '#232323' : '#fff',
            borderRadius: 12,
            paddingVertical: 18,
            paddingHorizontal: 16,
            width: '85%',
            maxWidth: 400,
            elevation: 6,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}>
            <Text style={{
              fontWeight: 'bold',
              fontSize: 17,
              marginBottom: 12,
              color: isDark ? '#fff' : '#000'
            }}>
              Select a predefined question
            </Text>
            <FlatList
              data={predefinedQuestions}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: isDark ? '#444' : '#ddd',
                  }}
                  onPress={() => handleModalSelect(item, modalTarget)}
                >
                  <Text style={{
                    color: isDark ? '#fff' : '#000',
                    fontSize: 16,
                  }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
              style={{ marginBottom: 10 }}
            />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                marginTop: 10,
                alignSelf: 'flex-end',
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  chartTimeContainer: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 10,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#000',
  },
  chartTimeLabel: {
    color: '#D4AF37',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  chartTimePicker: {
    color: '#D4AF37',
    backgroundColor: '#000',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginVertical: 10,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: Platform.OS === 'ios' ? 12 : 0,
    paddingHorizontal: 12,
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? undefined : 44,
    color: '#000',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginVertical: 10,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: Platform.OS === 'ios' ? 12 : 0,
    paddingHorizontal: 12,
  },
  pickerLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    marginLeft: 4,
    color: '#333',
  },
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
  strategyBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderColor: '#D4AF37',
    borderWidth: 1,
  },
  strategyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#000',
  },
  strategyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  value: {
    fontWeight: 'normal',
    color: '#333',
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
    backgroundColor: '#D4AF37',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  highConfidenceText: {
    color: '#fff',
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
  dropdownWrapper: {
    marginVertical: 10,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignSelf: 'center',
    width: '90%',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 12,
    height: 48,
  },
  predefinedDropdownWrapper: {
    width: '100%',
    marginTop: 8,
  },
  predefinedDropdown: {
    backgroundColor: '#fff',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    width: '100%',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '90%',
    alignSelf: 'center',
    marginVertical: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    textAlign: 'left',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#D4AF37',
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    width: '85%',
    maxWidth: 350,
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Dropdown Modal Styles
  modalSelector: {
    backgroundColor: '#111',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'center',
    marginVertical: 10,
    width: '90%',
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
    backgroundColor: '#000',
  },
  modalOptionText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '600',
  },
  modalValueBox: {
    backgroundColor: '#111',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  modalValueText: {
    color: '#D4AF37',
    fontWeight: '600',
  },
  timeframePickerContainer: {
    width: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginVertical: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  timeframePicker: {
    width: '100%',
    height: 44,
    color: '#333',
  },
  // --- Fixed and reformatted recommended size styles ---
  recommendedSizeBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  recommendedSizeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recommendedSizeValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#232323',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tradeTypeBadge: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    alignSelf: 'flex-start',
  },
  tradeTypeText: {
    color: '#D4AF37',
    fontWeight: '600',
    fontSize: 12,
  },
  pickerTitle: {
    color: '#D4AF37',
    fontSize: 16,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    padding: 10,
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 10,
    marginBottom: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#000',
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 4,
    padding: 10,
  },
  resultBox: {
    flex: 1,
    alignItems: 'center',
    padding: 5,
  },
  resultBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D4AF37',
  },
  resultLabel: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 12,
  },
  resultValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    width: '90%',
    alignSelf: 'center',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  dropdownOptionSelected: {
    backgroundColor: '#fdf6e3',
    borderRadius: 8,
  },
  dropdownTextSelected: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  dropdownOptionText: {
    color: '#000',
    fontWeight: '500',
  },
  dropdownLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D4AF37',
    textAlign: 'left',
    marginLeft: 20,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'none',
    letterSpacing: 0.5,
  },
});