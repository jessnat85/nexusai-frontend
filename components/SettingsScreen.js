import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function SettingsScreen() {
  const [language, setLanguage] = useState('');
  const [risk, setRisk] = useState('');
  const [portfolio, setPortfolio] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Portfolio Size</Text>
      <View style={styles.inputWrapper}>
        <Text style={styles.dollar}>$</Text>
        <TextInput
          value={portfolio}
          onChangeText={setPortfolio}
          keyboardType="numeric"
          placeholder="Enter your portfolio size"
          placeholderTextColor="#999"
          style={styles.input}
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>

      <Text style={styles.label}>Preferred Language</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={language}
          onValueChange={setLanguage}
          style={styles.picker}
          dropdownIconColor="#D4AF37"
        >
          <Picker.Item label="Select Language" value="" enabled={false} />
          <Picker.Item label="English" value="English" />
          <Picker.Item label="French" value="French" />
          <Picker.Item label="Spanish" value="Spanish" />
        </Picker>
      </View>

      <Text style={styles.label}>Risk Tolerance</Text>
      <View style={styles.pickerBox}>
        <Picker
          selectedValue={risk}
          onValueChange={setRisk}
          style={styles.picker}
          dropdownIconColor="#D4AF37"
        >
          <Picker.Item label="Select Risk Tolerance" value="" enabled={false} />
          <Picker.Item label="Low" value="low" />
          <Picker.Item label="Moderate" value="moderate" />
          <Picker.Item label="High" value="high" />
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60, // add space from top to avoid camera notch
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 30,
    alignSelf: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 30,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    flex: 1,
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
    paddingVertical: 8,
  },
  pickerBox: {
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 20,
    paddingHorizontal: 10,
    paddingVertical: 4, // reduce vertical padding
    justifyContent: 'center',
    height: 90, // smaller height
  },
  picker: {
    color: '#D4AF37',
    backgroundColor: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 20,
    paddingHorizontal: 10,
    height: 50,
  },
  dollar: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
});