"use client";

import showToast from "@/components/toast/show_toast";
import { useState } from "react";

export default function Home() {
  const [jsonInput, setJsonInput] = useState<string>("");
  const [fileName, setFileName] = useState<string>(""); // File name state
  const [dartCode, setDartCode] = useState<string>(""); // Store generated Dart code
  const [classNames, setClassNames] = useState<string[]>([]); // Store the class names
  const [fieldAnnotation, setFieldAnnotation] = useState<string>("final"); // Track field annotation type
  const [isGenerated, setIsGenerated] = useState<boolean>(false); // Track whether Dart model is generated

  const handleGenerate = () => {
    if (!jsonInput) {
      showToast("Please provide JSON input!", "warning");
      return;
    }

    try {
      const json = JSON.parse(jsonInput);
      const formattedFileName = fileName || "your_name_model";
      const className = toPascalCase(formattedFileName);

      const dartModel = generateFreezedModel(
        json,
        className,
        formattedFileName,
        fieldAnnotation
      );

      setDartCode(dartModel);
      const names = collectClassNames(dartModel);
      setClassNames(names);
      setFileName(names[0]); // Set file name to first class name
      setIsGenerated(true); // Mark as generated
      showToast("Dart freezed model generated successfully!", "success");
    } catch (error) {
      showToast("Invalid JSON input, Please make some change!");
    }
  };

  const generateFreezedModel = (
    json: object,
    className: string,
    fileName: string,
    fieldAnnotation: string
  ): string => {
    const models: string[] = [];
    const classNameCount: { [key: string]: number } = {}; // Track class names

    const processObject = (obj: object, name: string): string => {
      if (classNameCount[name]) {
        classNameCount[name]++;
        name = `${name}${classNameCount[name]}`;
      } else {
        classNameCount[name] = 1;
      }

      const fields = Object.entries(obj)
        .map(([key, value]) => {
          const camelCasedKey = camelCase(key);
          const dartType = getDartType(value);
          const annotation = fieldAnnotation === "required" ? "required" : "";
          const finalKeyword = fieldAnnotation === "final" ? "final" : "";

          if (
            typeof value === "object" &&
            !Array.isArray(value) &&
            value !== null
          ) {
            const nestedClassName = capitalize(camelCasedKey);
            models.push(processObject(value, nestedClassName));
            return `${annotation} ${finalKeyword} ${nestedClassName}? ${camelCasedKey};`;
          } else if (
            Array.isArray(value) &&
            value.length > 0 &&
            typeof value[0] === "object"
          ) {
            const nestedClassName = capitalize(camelCasedKey.slice(0, -1));
            models.push(processObject(value[0], nestedClassName));
            return `${annotation} ${finalKeyword} List<${nestedClassName}>? ${camelCasedKey};`;
          } else {
            return `${annotation} ${finalKeyword} ${dartType}? ${camelCasedKey};`;
          }
        })
        .join("\n");

      return `@freezed
class ${name} with _$${name} {
  const factory ${name}({
${fields}
  }) = _${name};

  factory ${name}.fromJson(Map<String, dynamic> json) =>
      _$${name}FromJson(json);
}
    `;
    };

    const importStatements = `import 'package:freezed_annotation/freezed_annotation.dart';
part '${fileName}.freezed.dart';
part '${fileName}.g.dart';`;

    models.push(processObject(json, className));
    return importStatements + "\n" + models.reverse().join("\n\n");
  };

  const getDartType = (value: any): string => {
    if (typeof value === "string") return "String";
    if (typeof value === "number") return value % 1 === 0 ? "int" : "double";
    if (typeof value === "boolean") return "bool";
    if (Array.isArray(value)) {
      const arrayType = value.length > 0 ? getDartType(value[0]) : "dynamic";
      return `List<${arrayType}>`;
    }
    if (typeof value === "object" && value !== null)
      return "Map<String, dynamic>";
    return "dynamic";
  };

  const camelCase = (str: string): string =>
    str
      .split("_")
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join("");

  const capitalize = (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const toPascalCase = (str: string): string =>
    str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

  const collectClassNames = (dartModel: string) => {
    const classNamesRegex = /class\s+(\w+)/g;
    let match;
    const names = [];
    while ((match = classNamesRegex.exec(dartModel)) !== null) {
      names.push(match[1]);
    }
    return names;
  };

  const handleDownloadFile = () => {
    const formattedFileName = fileName || "your_name_model";
    const blob = new Blob([dartCode], { type: "text/dart" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${formattedFileName}.dart`;
    link.click();
    showToast("Dart freezed model download successfully!", "success");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(dartCode).then(() => {
      showToast("Dart freezed code copied to clipboard!", "success");
    });
  };

  const handleClassNameChange = (index: number, newName: string) => {
    const updatedClassNames = [...classNames];
    const oldClassName = updatedClassNames[index];
    updatedClassNames[index] = newName;
    setClassNames(updatedClassNames);

    // Update the Dart code by replacing the class name wherever it occurs
    const updatedDartCode = updateClassNamesInDartCode(
      dartCode,
      oldClassName,
      newName
    );
    setDartCode(updatedDartCode);
  };

  const updateClassNamesInDartCode = (
    dartCode: string,
    oldClassName: string,
    newClassName: string
  ): string => {
    // Replace the class name references
    const classNameRegex = new RegExp(
      `(class|factory|fromJson)\\s+${oldClassName}`,
      "g"
    );
    let updatedDartCode = dartCode.replace(classNameRegex, (match) => {
      return match.replace(oldClassName, newClassName);
    });

    // Handle the underscore prefixed class names and methods
    updatedDartCode = updatedDartCode
      .replace(new RegExp(`_${oldClassName}`, "g"), `_${newClassName}`)
      .replace(new RegExp(`\\$${oldClassName}`, "g"), `\$${newClassName}`)
      .replace(
        new RegExp(`\\$${oldClassName}FromJson`, "g"),
        `\$${newClassName}FromJson`
      );

    return updatedDartCode;
  };

  return (
    <div className="relative h-screen w-screen">
      <video
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src="khmer.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="relative z-10 h-screen max-w-[2000px] mx-auto">
        <footer className="flex items-center justify-between px-[2%] h-14 fixed z-50 left-0 right-0 top-0 bg-gray-700">
          <div className="flex items-center">
            <h1 className="font-bold  bg-gradient-to-r text-2xl from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
              PHAT MENGHOR
            </h1>
            <h3 className="text-ms ml-2">(Json to freezed)</h3>
          </div>

          <div className="flex items-center justify-end ">
            {/* Generate Dart Code Button */}
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Generate Dart Code
            </button>

            {/* Display Dart Code after Generation */}
            {dartCode && (
              <div className="gap-4 flex">
                {/* Download Dart File Button */}
                <button
                  onClick={handleDownloadFile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md ml-4"
                >
                  Download Dart File
                </button>

                {/* Copy to Clipboard Button */}
                <button
                  onClick={handleCopyCode}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </footer>

        <section className=" h-screen pt-20">
          <div className="flex gap-8 h-full">
            <div className="flex-1 flex flex-col">
              <div className="flex gap-4">
                {/* File Name Input (editable until generation) */}
                <div className="flex-1">
                  <label className="block text-sm text-white font-medium mb-1">
                    File Name: underscore_file
                  </label>
                  <input
                    placeholder="your_name_model"
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full px-2 h-10 border bg-gray-700 border-gray-300 rounded-md"
                  />
                </div>
                {/* Field Annotation Select */}
                <div className="min-w-36">
                  <label className="block text-sm font-medium mb-1 text-white">
                    Field Annotation:
                  </label>
                  <select
                    value={fieldAnnotation}
                    onChange={(e) => setFieldAnnotation(e.target.value)}
                    className="w-full px-2 h-10 border bg-gray-700  border-gray-300 rounded-md"
                  >
                    <option value="final">final optional</option>
                    <option value="required">required</option>
                    <option value="optional">optional</option>
                  </select>
                </div>
              </div>

              {/* JSON Input Area */}
              <textarea
                placeholder="Paste JSON here..."
                className="w-full p-2 border border-gray-300 rounded-md mt-4 flex-1 bg-gray-700"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              ></textarea>
            </div>

            {/* Editable Class Names */}
            {isGenerated && (
              <div className="mt-4 overflow-y-auto">
                <h2 className="text-lg text-md mb-2">Class Names</h2>
                {classNames.map((className, index) => (
                  <div key={index} className="flex gap-2 mb-2 overflow-y-auto">
                    <input
                      type="text"
                      value={className}
                      onChange={(e) =>
                        handleClassNameChange(index, e.target.value)
                      }
                      className="w-full px-2 h-10 border bg-gray-700 border-gray-300 rounded-md"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-1">
              <pre className="bg-gray-100 text-black w-full p-4 rounded-md whitespace-pre-wrap break-words overflow-auto">
                {dartCode}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
