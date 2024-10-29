"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { uploadSingleImage, uploadMultipleImages } from '@/services/upload-file'


import { supabase } from '@/lib/supabase'

interface FormValues {
  title: string
  description: string
  singleImage?: File
  multipleImages?: File[]
}

interface SubmissionData {
  id: string
  title: string
  description: string
  single_image_url: string
  multiple_image_urls: string[]
  created_at: string
}

export default function ImageUploadAndDisplay() {
  const queryClient = useQueryClient()
  const [singleImagePreview, setSingleImagePreview] = useState<string | null>(null)
  const [multipleImagePreviews, setMultipleImagePreviews] = useState<string[]>([])

  const form = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
    },
  })

  const { register, handleSubmit, setValue, formState: { errors } } = form

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'singleImage' | 'multipleImages') => {
    const files = e.target.files
    if (files) {
      if (fieldName === 'singleImage') {
        setValue(fieldName, files[0])
        setSingleImagePreview(URL.createObjectURL(files[0]))
      } else {
        setValue(fieldName, Array.from(files))
        setMultipleImagePreviews(Array.from(files).map(file => URL.createObjectURL(file)))
      }
    }
  }

  const uploadMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { title, description, singleImage, multipleImages } = values

      let singleImageUrl = ''
      let multipleImageUrls: string[] = []

      if (singleImage) {
        singleImageUrl = await uploadSingleImage(singleImage, supabase)
      }

      if (multipleImages && multipleImages.length > 0) {
        multipleImageUrls = await uploadMultipleImages(multipleImages, supabase)
      }

      // Insert into form_submissions table
      const { data, error } = await supabase
        .from('form_submissions')
        .insert({
          title,
          description,
          single_image_url: singleImageUrl,
          multiple_image_urls: multipleImageUrls,
        })
        .select()

      if (error) throw error

      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formSubmissions'] })
      toast.success('Form submitted successfully!')
      form.reset()
      setSingleImagePreview(null)
      setMultipleImagePreviews([])
    },
    onError: (error) => {
      console.error('Submission error:', error)
      toast.error('Failed to submit form. Please try again.')
    },
  })

  const onSubmit = (values: FormValues) => {
    uploadMutation.mutate(values)
  }

  // Query to fetch submitted data
  const { data: submittedData, isLoading, isError } = useQuery<SubmissionData[]>({
    queryKey: ['formSubmissions'],
    queryFn: async () => {  
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Image Upload Form</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter title" {...field} />
                    </FormControl>
                    {errors.title && <FormMessage>{errors.title.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter description" {...field} />
                    </FormControl>
                    {errors.description && <FormMessage>{errors.description.message}</FormMessage>}
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Single Image</FormLabel>
                <FormControl>
                  <Input 
                    type="file" 
                    {...register('singleImage')}
                    onChange={(e) => handleFileChange(e, 'singleImage')} 
                    accept="image/*" 
                  />
                </FormControl>
                <FormDescription>Upload a single image</FormDescription>
                {errors.singleImage && <FormMessage>{errors.singleImage.message}</FormMessage>}
                {singleImagePreview && (
                  <div className="mt-2">
                    <img src={singleImagePreview} alt="Single image preview" className="max-w-full h-auto rounded-lg" />
                  </div>
                )}
              </FormItem>
              <FormItem>
                <FormLabel>Multiple Images</FormLabel>
                <FormControl>
                  <Input 
                    type="file" 
                    {...register('multipleImages')}
                    onChange={(e) => handleFileChange(e, 'multipleImages')} 
                    accept="image/*" 
                    multiple 
                  />
                </FormControl>
                <FormDescription>Upload multiple images</FormDescription>
                {errors.multipleImages && <FormMessage>{errors.multipleImages.message}</FormMessage>}
                {multipleImagePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {multipleImagePreviews.map((preview, index) => (
                      <img key={index} src={preview} alt={`Preview ${index + 1}`} className="w-full h-auto rounded-lg" />
                    ))}
                  </div>
                )}
              </FormItem>
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Submitted Data</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading...</p>}
          {isError && <p>Error loading data</p>}
          {submittedData && Array.isArray(submittedData) && submittedData.length > 0 ? (
            <div className="space-y-6">
              {submittedData?.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-2">{submission.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{submission.description}</p>
                    {submission.single_image_url && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Single Image:</h4>
                        <img src={submission.single_image_url} alt="Single uploaded image" className="max-w-full h-auto rounded-lg" />
                      </div>
                    )}
                    {submission.multiple_image_urls && submission.multiple_image_urls.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Multiple Images:</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {submission.multiple_image_urls?.map((url: string, index: number) => (
                            <img key={index} src={url} alt={`Uploaded image ${index + 1}`} className="w-full h-auto rounded-lg" />
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-4">Submitted on: {new Date(submission.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p>No submissions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}