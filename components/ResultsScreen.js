import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { Feather, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';

export default function ResultsScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('https://nexus-ai-backend-1.onrender.com/history/jessnat');
        const data = await res.json();
        setHistory(data.reverse());
      } catch (err) {
        setError('Failed to fetch trade history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Analyzing trades...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Trade History</Text>
      {history.length === 0 ? (
        <Text style={styles.noHistory}>No trades found yet.</Text>
      ) : (
        history.map((trade, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.strategy}>{trade.strategy}</Text>
            <Text style={styles.metaLine}>
              <Feather name="calendar" size={14} /> {new Date(trade.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.metaLine}>
              <AntDesign name="arrowright" size={14} /> Signal: <Text style={{ color: trade.signal === 'Buy' ? 'darkgreen' : 'darkred' }}>{trade.signal}</Text>
            </Text>
            <Text style={styles.metaLine}>
              <MaterialCommunityIcons name="brain" size={14} /> Bias: {trade.bias} | Confidence: {trade.confidence}%
            </Text>
            <Text style={styles.metaLine}>
              <Feather name="activity" size={14} /> Pattern: {trade.pattern}
            </Text>
            <Text style={styles.metaLine}>
              <Feather name="target" size={14} /> Entry: {trade.entry} | SL: {trade.stopLoss} | TP: {trade.takeProfit}
            </Text>
            <Text style={styles.metaLine}>
              <Feather name="trending-up" size={14} /> RR: {formatRR(trade.entry, trade.stopLoss, trade.takeProfit)} | Size: {trade.recommendedSize}
            </Text>
            <Text style={styles.metaLine}>
              <Feather name="briefcase" size={14} /> {trade.tradeType} | {trade.assetType}
            </Text>
            {trade.isSuperTrade && (
              <Text style={styles.superTrade}>Nexus Confluence Trade</Text>
            )}
            {trade.isTopPick && (
              <Text style={styles.topPick}>Top Pick</Text>
            )}
            {trade.isSaved ? (
              <View
                style={{
                  backgroundColor: '#e6e6e6',
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 4,
                  alignSelf: 'flex-start',
                  marginTop: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Feather name="check" size={14} color="black" style={{ marginRight: 6 }} />
                <Text style={{ color: 'black', fontWeight: '600', fontSize: 13 }}>Saved</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={async () => {
                  await fetch(`https://nexus-ai-backend-1.onrender.com/save-trade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tradeId: trade.id }),
                  });
                  setHistory((prev) => {
                    const updated = [...prev];
                    updated[index].isSaved = true;
                    setToastVisible(true);
                    setTimeout(() => setToastVisible(false), 2000);
                    return updated;
                  });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f0e6d2',
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#D4AF37',
                  marginTop: 6,
                  alignSelf: 'flex-start',
                }}
              >
                <Feather name="bookmark" size={14} color="#D4AF37" style={{ marginRight: 6 }} />
                <Text style={{ color: '#000', fontSize: 13, fontWeight: '500' }}>Save</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.commentary}>{trade.commentary}</Text>
            <Text style={styles.metaLine}>
              Outcome: {trade.outcome ? trade.outcome : 'Not tagged yet'}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <TouchableOpacity
                onPress={async () => {
                  await fetch(`https://nexus-ai-backend-1.onrender.com/update-outcome`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      tradeId: trade.id,
                      outcome: 'Win',
                    }),
                  });
                  setHistory((prev) => {
                    const updated = [...prev];
                    updated[index].outcome = 'Win';
                    return updated;
                  });
                }}
                style={{ backgroundColor: 'darkgreen', padding: 6, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: '#fff' }}>Win</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  await fetch(`https://nexus-ai-backend-1.onrender.com/update-outcome`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      tradeId: trade.id,
                      outcome: 'Loss',
                    }),
                  });
                  setHistory((prev) => {
                    const updated = [...prev];
                    updated[index].outcome = 'Loss';
                    return updated;
                  });
                }}
                style={{ backgroundColor: 'darkred', padding: 6, borderRadius: 6 }}
              >
                <Text style={{ color: '#fff' }}>Loss</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      {toastVisible && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✅ Trade saved successfully.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function formatRR(entry, stop, target) {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (!risk) return 'N/A';
  return (reward / risk).toFixed(2);
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontStyle: 'italic',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  noHistory: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 14,
    paddingBottom: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  strategy: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  metaLine: {
    fontSize: 14,
    marginTop: 2,
  },
  superTrade: {
    color: '#D4AF37',
    fontWeight: 'bold',
    marginTop: 6,
  },
  topPick: {
    color: 'darkblue',
    fontWeight: 'bold',
    marginTop: 6,
  },
  commentary: {
    marginTop: 6,
    fontStyle: 'italic',
    fontSize: 14,
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    left: '10%',
    right: '10%',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toastText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
